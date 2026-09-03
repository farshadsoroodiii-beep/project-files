backend\middlewares\upload\temporary-main-image-upload.middleware.js
/*==================================================
    TEMPORARY MAIN IMAGE UPLOAD MIDDLEWARE (V1.1)

    Temporary Main Image Upload Boundary

    Responsibility:
    - Receive one temporary main image
    - Stage uploaded file with Multer
    - Enforce 10 MB upload limit
    - Reject multiple files
    - Validate actual image content
    - Validate decoded image dimensions
    - Validate REAL image decode
    - Allow JPEG / PNG / WebP only
    - Cleanup staged file after validation failure
    - Normalize upload validation errors
    - Expose validated file through req.file

    No:
    - Database Logic
    - Temporary Asset Persistence
    - Car Business Validation
    - Session Validation
    - Slot Business Validation
    - Permanent Storage
    - Promotion
    - Complete Save
    - Transaction Logic

==================================================*/

'use strict';

const multer =
    require('multer');

const path =
    require('path');

const fs =
    require('fs');

const sharp =
    require('sharp');

/*==============================================
    STAGING PATH

    backend/
    └── storage/
        └── cars/
            └── staging/
==============================================*/

const stagingPath =
    path.resolve(
        __dirname,
        '../../storage/cars/staging'
    );

/*==============================================
    UPLOAD LIMIT

    Maximum accepted image size:
    10 MB
==============================================*/

const MAX_FILE_SIZE =
    10 * 1024 * 1024;

/*==============================================
    ALLOWED IMAGE TYPES

    Main Image Contract:
    - JPEG
    - PNG
    - WebP
==============================================*/

const ALLOWED_MIME_TYPES =
    new Set([
        'image/jpeg',
        'image/png',
        'image/webp'
    ]);

/*==============================================
    ALLOWED ACTUAL IMAGE FORMATS

    These values come from Sharp metadata.

    They are authoritative for actual
    image content validation.
==============================================*/

const ALLOWED_IMAGE_FORMATS =
    new Set([
        'jpeg',
        'png',
        'webp'
    ]);

/*==============================================
    ENSURE STAGING DIRECTORY
==============================================*/

if (
    !fs.existsSync(
        stagingPath
    )
) {

    fs.mkdirSync(
        stagingPath,
        {
            recursive: true
        }
    );

}

/*==============================================
    NORMALIZE VALIDATION ERROR
==============================================*/

function createValidationError(
    message,
    code,
    field = 'file'
) {

    const error =
        new Error(
            message
        );

    error.code =
        code;

    error.status =
        400;

    error.type =
        'invalid';

    error.field =
        field;

    return error;

}

/*==============================================
    SAFE STAGED FILE CLEANUP
==============================================*/

async function cleanupStagedFile(
    filePath
) {

    if (
        typeof filePath !== 'string' ||
        !filePath.length
    ) {

        return;

    }

    try {

        await fs.promises.unlink(
            filePath
        );

    } catch (error) {

        /*
            The file may already have been
            removed by another cleanup path.
        */

        if (
            error.code === 'ENOENT'
        ) {

            return;

        }

        /*
            Cleanup failure must not hide the
            original validation failure.
        */

    }

}

/*==============================================
    MULTER STORAGE
==============================================*/

const storage =
    multer.diskStorage({

        destination: (
            req,
            file,
            cb
        ) => {

            cb(
                null,
                stagingPath
            );

        },

        filename: (
            req,
            file,
            cb
        ) => {

            /*
                The original filename is metadata
                only.

                It must never become the server-side
                storage identity.
            */

            const extension =
                path.extname(
                    file.originalname
                );

            const uniqueName =
                `main-image-${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2)}${extension}`;

            cb(
                null,
                uniqueName
            );

        }

    });

/*==============================================
    FILE FILTER

    Early MIME rejection.

    This is NOT the final image validation.

    Actual file content is validated later
    through Sharp.
==============================================*/

const fileFilter = (
    req,
    file,
    cb
) => {

    if (
        typeof file.mimetype === 'string' &&
        ALLOWED_MIME_TYPES.has(
            file.mimetype
        )
    ) {

        cb(
            null,
            true
        );

        return;

    }

    const error =
        createValidationError(
            'Only JPEG, PNG, and WebP images are allowed.',
            'INVALID_IMAGE_TYPE'
        );

    cb(
        error,
        false
    );

};

/*==============================================
    MULTER INSTANCE
==============================================*/

const upload =
    multer({

        storage,

        fileFilter,

        limits: {

            fileSize:
                MAX_FILE_SIZE,

            /*
                Main Image Contract:
                exactly one uploaded file.
            */

            files: 1

        }

    });

/*==============================================
    VALIDATE ACTUAL IMAGE CONTENT
==============================================*/

async function validateImageFile(
    file
) {

    if (
        !file ||
        typeof file.path !== 'string' ||
        !file.path.length
    ) {

        throw createValidationError(
            'Image file is required.',
            'MISSING_FILE'
        );

    }

    /*==========================================
        VERIFY STAGED FILE EXISTS
    ==========================================*/

    try {

        await fs.promises.access(
            file.path,
            fs.constants.F_OK
        );

    } catch {

        throw createValidationError(
            'Uploaded image file was not found.',
            'MISSING_FILE'
        );

    }

    /*==========================================
        SHARP METADATA
    ==========================================*/

    let metadata;

    try {

        /*
            Sharp reads the actual file.

            MIME type supplied by the client
            is NOT trusted here.
        */

        metadata =
            await sharp(
                file.path
            ).metadata();

    } catch {

        throw createValidationError(
            'Uploaded file is not a valid image.',
            'INVALID_IMAGE_CONTENT'
        );

    }

    /*==========================================
        ACTUAL IMAGE FORMAT
    ==========================================*/

    const format =
        typeof metadata.format === 'string'
            ? metadata.format.toLowerCase()
            : null;

    if (
        !ALLOWED_IMAGE_FORMATS.has(
            format
        )
    ) {

        throw createValidationError(
            'Only JPEG, PNG, and WebP images are allowed.',
            'INVALID_IMAGE_TYPE'
        );

    }

    /*==========================================
        MIME / ACTUAL FORMAT CONSISTENCY
    ==========================================*/

    const expectedMimeByFormat = {

        jpeg:
            'image/jpeg',

        png:
            'image/png',

        webp:
            'image/webp'

    };

    const expectedMime =
        expectedMimeByFormat[
            format
        ];

    if (
        file.mimetype !== expectedMime
    ) {

        throw createValidationError(
            'Uploaded image MIME type does not match its actual image format.',
            'INVALID_IMAGE_CONTENT'
        );

    }

    /*==========================================
        DIMENSIONS
    ==========================================*/

    const width =
        Number(
            metadata.width
        );

    const height =
        Number(
            metadata.height
        );

    if (
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
    ) {

        throw createValidationError(
            'Image dimensions are invalid.',
            'INVALID_IMAGE_CONTENT'
        );

    }

    /*==========================================
        REAL IMAGE DECODE

        metadata() alone is NOT sufficient.

        Sharp must actually decode the image
        and produce a raw pixel buffer.
    ==========================================*/

    try {

        const decoded =
            await sharp(
                file.path
            )
                .raw()
                .toBuffer({
                    resolveWithObject: true
                });

        if (
            !Buffer.isBuffer(
                decoded.data
            ) ||
            decoded.data.length === 0
        ) {

            throw new Error(
                'Decoded pixel buffer is empty.'
            );

        }

        if (
            !Number.isFinite(
                Number(
                    decoded.info.width
                )
            ) ||
            Number(
                decoded.info.width
            ) <= 0 ||
            !Number.isFinite(
                Number(
                    decoded.info.height
                )
            ) ||
            Number(
                decoded.info.height
            ) <= 0
        ) {

            throw new Error(
                'Decoded image dimensions are invalid.'
            );

        }

    } catch {

        throw createValidationError(
            'Uploaded image could not be decoded.',
            'INVALID_IMAGE_CONTENT'
        );

    }

    /*==========================================
        AUTHORITATIVE RUNTIME METADATA
    ==========================================*/

    file.imageMetadata = {

        format,

        width,

        height

    };

    return file;

}

/*==============================================
    SINGLE MAIN IMAGE UPLOAD
==============================================*/

const uploadSingleMainImage =
    upload.single(
        'file'
    );

/*==============================================
    MAIN IMAGE UPLOAD MIDDLEWARE
==============================================*/

const uploadTemporaryMainImage =
    (
        req,
        res,
        next
    ) => {

        uploadSingleMainImage(
            req,
            res,
            async error => {

                /*==================================
                    MULTER ERROR
                ==================================*/

                if (
                    error
                ) {

                    /*================================
                        FILE SIZE

                        > 10 MB
                    =================================*/

                    if (
                        error instanceof multer.MulterError &&
                        error.code === 'LIMIT_FILE_SIZE'
                    ) {

                        await cleanupStagedFile(
                            req.file &&
                            req.file.path
                        );

                        next(
                            createValidationError(
                                'Image file size must not exceed 10 MB.',
                                'IMAGE_TOO_LARGE'
                            )
                        );

                        return;

                    }

                    /*================================
                        MULTIPLE FILES

                        upload.single('file') allows
                        exactly one file.

                        Multer throws:
                            LIMIT_UNEXPECTED_FILE

                        Normalize it to the application
                        HTTP error contract.
                    =================================*/

                    if (
                        error instanceof multer.MulterError &&
                        error.code === 'LIMIT_UNEXPECTED_FILE'
                    ) {

                        await cleanupStagedFile(
                            req.file &&
                            req.file.path
                        );

                        next(
                            createValidationError(
                                'Only one main image file is allowed.',
                                'MULTIPLE_FILES_NOT_ALLOWED'
                            )
                        );

                        return;

                    }

                    /*================================
                        APPLICATION VALIDATION ERROR

                        Example:
                            INVALID_IMAGE_TYPE
                    =================================*/

                    await cleanupStagedFile(
                        req.file &&
                        req.file.path
                    );

                    /*
                        If the error is already normalized,
                        preserve its contract.

                        Otherwise normalize it as a
                        generic invalid upload.
                    */

                    if (
                        error.status &&
                        error.code &&
                        error.type
                    ) {

                        next(
                            error
                        );

                        return;

                    }

                    next(
                        createValidationError(
                            'Invalid image upload.',
                            'INVALID_UPLOAD'
                        )
                    );

                    return;

                }

                /*==================================
                    MISSING FILE
                ==================================*/

                if (
                    !req.file
                ) {

                    next(
                        createValidationError(
                            'Image file is required.',
                            'MISSING_FILE'
                        )
                    );

                    return;

                }

                /*==================================
                    ACTUAL IMAGE VALIDATION
                ==================================*/

                try {

                    await validateImageFile(
                        req.file
                    );

                    /*
                        At this point:

                        - MIME is allowed
                        - Actual format is allowed
                        - MIME matches actual format
                        - Width > 0
                        - Height > 0
                        - Sharp successfully decoded
                        - Raw pixel buffer exists
                        - File is staged

                        Therefore req.file is now
                        validated runtime data.
                    */

                    next();

                } catch (validationError) {

                    await cleanupStagedFile(
                        req.file &&
                        req.file.path
                    );

                    next(
                        validationError
                    );

                }

            }
        );

    };

module.exports =
    uploadTemporaryMainImage;
