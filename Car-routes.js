backend\routes\admin\cars\cars.routes.js
/*==================================================

ADMIN CARS ROUTES (V1.4)

Admin Vehicle Management APIs

==================================================*/

'use strict';

const express =
    require('express');

const router =
    express.Router();

const adminMiddleware =
    require('../../../middlewares/auth/admin.middleware.js');

const AdminCarController =
    require('../../../controllers/admin/cars/cars.controller');

const TemporaryGalleryUploadController =
    require('../../../controllers/admin/cars/temporary-gallery-upload.controller');

const TemporaryGalleryPreviewController =
    require('../../../controllers/admin/cars/temporary-gallery-preview.controller');

const TemporaryMainImageUploadController =
    require('../../../controllers/admin/cars/temporary-main-image-upload.controller');

const TemporaryMainImagePreviewController =
    require('../../../controllers/admin/cars/temporary-main-image-preview.controller');

const uploadTemporaryGalleryImage =
    require('../../../middlewares/upload/temporary-gallery-upload.middleware');

const uploadTemporaryMainImage =
    require('../../../middlewares/upload/temporary-main-image-upload.middleware');

/*==============================================
    GET ALL CARS

    GET /api/admin/cars
==============================================*/

router.get(

    '/',

    adminMiddleware,

    AdminCarController.getCars

);

/*==============================================
    TEMPORARY GALLERY UPLOAD

    POST /api/admin/cars/:carId/gallery/temp

    multipart/form-data

    image:
        Uploaded image

    sessionId:
        Edit Session ID

    IMPORTANT:

    This route MUST be before /:id
    so the parameter route does not
    intercept the request.
==============================================*/

router.post(

    '/:carId/gallery/temp',

    adminMiddleware,

    uploadTemporaryGalleryImage,

    TemporaryGalleryUploadController.upload

);

/*==============================================
    TEMPORARY GALLERY PRIVATE PREVIEW

    GET /api/admin/cars/:carId/gallery/temp/:tempId/preview

    Authentication:
        adminMiddleware

    IMPORTANT:

    This endpoint serves files from the
    PRIVATE temporary storage.

    It MUST NOT use express.static()
    and MUST NOT expose /storage publicly.
==============================================*/

router.get(

    '/:carId/gallery/temp/:tempId/preview',

    adminMiddleware,

    TemporaryGalleryPreviewController.preview

);

/*==============================================
    TEMPORARY MAIN IMAGE UPLOAD

    POST /api/admin/cars/:carId/main-images/temp

    multipart/form-data

    file:
        Uploaded Main Vehicle Image

    sessionId:
        Edit Session ID

    slot:
        main_image | background_image

    Flow:

        Request
            ↓
        adminMiddleware
            ↓
        uploadTemporaryMainImage
            ↓
        TemporaryMainImageUploadController
            ↓
        TemporaryMainImageUploadUseCase

    IMPORTANT:

    This route MUST be before /:id
    so /main-images/... cannot be
    intercepted by the generic car
    parameter route.
==============================================*/

router.post(

    '/:carId/main-images/temp',

    adminMiddleware,

    uploadTemporaryMainImage,

    TemporaryMainImageUploadController.upload

);

/*==============================================
    TEMPORARY MAIN IMAGE PRIVATE PREVIEW

    GET /api/admin/cars/:carId/main-images/temp/:tempId/preview

    Query:
        sessionId

    Authentication:
        adminMiddleware

    IMPORTANT:

    This endpoint serves files from the
    PRIVATE temporary Main Image storage.

    It MUST NOT use express.static()
    and MUST NOT expose /storage publicly.

    The Controller delegates all business
    and filesystem validation to the
    Preview Use Case.
==============================================*/

router.get(

    '/:carId/main-images/temp/:tempId/preview',

    adminMiddleware,

    TemporaryMainImagePreviewController.preview

);

/*==============================================
    GET CAR DETAILS

    GET /api/admin/cars/:id
==============================================*/

router.get(

    '/:id',

    adminMiddleware,

    AdminCarController.getCarById

);

/*==============================================
    CREATE CAR

    POST /api/admin/cars
==============================================*/

router.post(

    '/',

    adminMiddleware,

    AdminCarController.createCar

);

/*==============================================
    UPDATE CAR

    PUT /api/admin/cars/:id
==============================================*/

router.put(

    '/:id',

    adminMiddleware,

    AdminCarController.updateCar

);

/*==============================================
    DELETE CAR

    DELETE /api/admin/cars/:id
==============================================*/

router.delete(

    '/:id',

    adminMiddleware,

    AdminCarController.deleteCar

);

module.exports =
    router;
