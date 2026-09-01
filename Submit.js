admin-panel\js\modules\cars\edit\submit.js
/*==================================================
    CARS EDIT SUBMIT

    Responsible for:
    - Collecting form data
    - Validation
    - Mapping car payload
    - Building complete edit intent
    - Building Gallery save intent
    - Building Main Vehicle Images save intent
    - Building Display Locations save intent
    - Sending complete edit save request
    - Success/Error handling

    Complete Edit Save Architecture:

    Form
      ↓
    Car Payload
      +
    Gallery Working State
      +
    Main Vehicle Images Working State
      +
    Display Locations Working State
      ↓
    Complete Edit Intent
      ↓
    CarsEditAPI.updateCar()
      ↓
    CompleteEditSaveUseCase
      ↓
    ONE Transaction

    Display Locations Contract:

        displayLocations:
        {
            locations:
            [
                {
                    location:
                        section_slug,

                    sortOrder:
                        integer
                }
            ]
        }

    Display Locations Rules:

    - DisplayLocationsState is the frontend authority
      for current working selections.
    - Submit reads only DisplayLocationsState.getWorking().
    - No DOM reading for Display Locations.
    - No section_id is sent by the frontend.
    - No car_id is sent inside Display Locations.
    - No page/card position is part of the current
      Display Locations contract.
    - Empty selection is valid and is sent as [].
    - Backend resolves section_slug -> section_id.
    - Backend persists Display Locations in the same
      Complete Edit transaction.

    No:
    - Form initialization
    - Event binding
    - DOM setup
    - Gallery drag & drop logic
    - Direct gallery persistence
    - Direct Main Image persistence
    - Direct Display Locations persistence
    - Separate gallery reorder API call
    - Separate Main Image save API call
    - Separate Display Locations save API call

    Architecture:
    IIFE Module
==================================================*/

'use strict';

const CarsEditSubmit = (() => {

    /*==================================================
        HANDLE SUBMIT
    ==================================================*/

    async function submit(event, options = {}) {

        event.preventDefault();

        const {
            form,
            carId,
            onSuccess,
            setLoading,
            clearErrors
        } = options;

        /*==================================================
            REQUIRED DATA
        ==================================================*/

        if (!form || !carId) {

            console.error(
                "Cars Edit Submit: Missing required data."
            );

            return;
        }

        /*==================================================
            LOADING GUARD
        ==================================================*/

        if (
            typeof FormState !== "undefined" &&
            FormState.isLoading()
        ) {

            return;
        }

        /*==================================================
            CLEAR PREVIOUS ERRORS
        ==================================================*/

        if (clearErrors) {

            clearErrors();
        }

        /*==================================================
            COLLECT FORM DATA
        ==================================================*/

        const formData =
            FormFields.collect(form);

        /*==================================================
            VALIDATION
        ==================================================*/

        if (
            typeof CarsEditValidation !==
            "undefined"
        ) {

            const result =
                CarsEditValidation.validate(
                    formData
                );

            if (!result.valid) {

                FormErrorManager.handle(
                    result.errors
                );

                return;
            }
        }

        /*==================================================
            MAP CAR FORM DATA
        ==================================================*/

        let carPayload = formData;

        if (
            typeof CarsEditMapper !==
            "undefined"
        ) {

            carPayload =
                CarsEditMapper.mapFormToPayload(
                    formData
                );

        }

        /*==================================================
            GALLERY PAYLOAD
        ==================================================

            Gallery changes are local Working State
            changes until the Complete Edit Save.

            Working State:

            working.order
                [
                    permanentImageId,
                    permanentImageId,
                    ...
                ]

            working.deleted
                [
                    permanentImageId,
                    permanentImageId,
                    ...
                ]

            working.added
                [
                    {
                        tempId,
                        sessionId,
                        originalName,
                        storagePath,
                        mimeType,
                        fileSize,
                        status
                    }
                ]

            Complete Edit Save Intent:

            gallery:
                {
                    sessionId,
                    order:
                        [
                            {
                                id,
                                sort_order
                            }
                        ],

                    deleted:
                        [
                            imageId,
                            ...
                        ],

                    added:
                        [
                            {
                                tempId,
                                sort_order
                            }
                        ]
                }

            IMPORTANT:

            working.order contains ONLY permanent images.

            working.added contains ONLY temporary assets.

            The final sort_order of temporary assets must
            be calculated from the COMPLETE visual gallery
            order.

            Therefore the final order is reconstructed from:

                Existing Working State
                       +
                Temporary Working State

            without putting temporary IDs into
            gallery.order.
        ==================================================*/

        let galleryPayload = {

            sessionId: null,

            order: [],

            deleted: [],

            added: []

        };

        if (
            typeof CarsImagesState !==
            "undefined"
        ) {

            const workingState =
                CarsImagesState.getWorkingState();

            /*==============================================
                SESSION ID
            ==============================================*/

            galleryPayload.sessionId =
                resolveGallerySessionId(
                    workingState
                );

            /*==============================================
                PERMANENT ORDER
            ==============================================*/

            const permanentOrder =
                workingState &&
                Array.isArray(
                    workingState.order
                )
                    ? workingState.order
                    : [];

            /*==============================================
                DELETED
            ==============================================*/

            const deletedIds =
                workingState &&
                Array.isArray(
                    workingState.deleted
                )
                    ? workingState.deleted
                    : [];

            galleryPayload.deleted =
                deletedIds
                    .map(
                        imageId =>
                            Number(imageId)
                    )
                    .filter(
                        imageId =>
                            Number.isInteger(
                                imageId
                            ) &&
                            imageId > 0
                    );

            /*==============================================
                TEMPORARY ASSETS
            ==============================================*/

            const temporaryAssets =
                workingState &&
                Array.isArray(
                    workingState.added
                )
                    ? workingState.added
                    : [];

            /*
             * IMPORTANT:
             *
             * working.order contains only permanent
             * image IDs.
             *
             * working.added contains temporary assets.
             *
             * The DOM is the authoritative visual order
             * for the Complete Edit Intent because it
             * contains both Existing and Temporary items.
             */

            let visualGalleryItems = [];

            if (
                typeof CarsImagesGallery !==
                "undefined" &&
                typeof CarsImagesGallery
                    .getCurrentOrder ===
                    "function"
            ) {

                /*
                 * getCurrentOrder() intentionally returns
                 * only permanent IDs, so it cannot be used
                 * to calculate temporary sort_order.
                 *
                 * Therefore temporary sort_order is built
                 * using the current gallery DOM directly.
                 */

                const galleryContainer =
                    document.querySelector(
                        "[data-gallery-list]"
                    );

                if (galleryContainer) {

                    visualGalleryItems =
                        Array.from(
                            galleryContainer.children
                        )
                            .filter(
                                item =>
                                    item.classList.contains(
                                        "gallery-item"
                                    )
                            );

                }

            }

            /*==============================================
                BUILD FINAL COMBINED SORT ORDER
            ==============================================*/

            const temporaryById =
                new Map();

            temporaryAssets.forEach(
                asset => {

                    if (
                        !asset ||
                        typeof asset !==
                            "object"
                    ) {

                        return;

                    }

                    if (
                        typeof asset.tempId !==
                            "string" ||
                        !asset.tempId.trim()
                    ) {

                        return;

                    }

                    temporaryById.set(
                        asset.tempId,
                        asset
                    );

                }
            );

            /*
             * First preference:
             *
             * Build the final visual order directly
             * from the Gallery DOM.
             *
             * This preserves:
             *
             * Existing + Temporary
             *
             * exactly as displayed to the user.
             */

            if (
                visualGalleryItems.length
            ) {

                const permanentItems = [];
                const temporaryItems = [];

                visualGalleryItems.forEach(
                    item => {

                        const imageType =
                            item.dataset.imageType;

                        if (
                            imageType ===
                            "existing"
                        ) {

                            const imageId =
                                Number(
                                    item.dataset.imageId
                                );

                            if (
                                Number.isInteger(
                                    imageId
                                ) &&
                                imageId > 0
                            ) {

                                permanentItems.push({

                                    id:
                                        imageId,

                                    sort_order:
                                        visualGalleryItems
                                            .indexOf(item) +
                                        1

                                });

                            }

                            return;

                        }

                        if (
                            imageType ===
                            "temporary"
                        ) {

                            const tempId =
                                item.dataset.tempId;

                            if (
                                typeof tempId ===
                                    "string" &&
                                tempId.trim()
                            ) {

                                temporaryItems.push({

                                    tempId:
                                        tempId,

                                    sort_order:
                                        visualGalleryItems
                                            .indexOf(item) +
                                        1

                                });

                            }

                        }

                    }
                );

                /*
                 * Permanent order:
                 *
                 * Only Existing images are sent to
                 * gallery.order.
                 */

                galleryPayload.order =
                    permanentItems;

                /*
                 * Temporary order:
                 *
                 * Only Temporary assets are sent to
                 * gallery.added.
                 */

                galleryPayload.added =
                    temporaryItems
                        .filter(
                            item =>
                                temporaryById.has(
                                    item.tempId
                                )
                        )
                        .map(
                            item => ({

                                tempId:
                                    item.tempId,

                                sort_order:
                                    item.sort_order

                            })
                        );

            } else {

                /*
                 * Defensive fallback:
                 *
                 * If the Gallery DOM is unavailable,
                 * preserve the Working State order.
                 *
                 * Temporary assets are appended after
                 * the permanent Working State.
                 *
                 * Normally this branch should not be
                 * reached during a normal Edit Session.
                 */

                galleryPayload.order =
                    permanentOrder
                        .map(
                            (imageId, index) => ({

                                id:
                                    Number(
                                        imageId
                                    ),

                                sort_order:
                                    index + 1

                            })
                        )
                        .filter(
                            item =>
                                Number.isInteger(
                                    item.id
                                ) &&
                                item.id > 0
                        );

                galleryPayload.added =
                    temporaryAssets
                        .filter(
                            asset =>
                                asset &&
                                typeof asset.tempId ===
                                    "string" &&
                                asset.tempId.trim()
                        )
                        .map(
                            (
                                asset,
                                index
                            ) => ({

                                tempId:
                                    asset.tempId,

                                sort_order:
                                    galleryPayload
                                        .order
                                        .length +
                                    index +
                                    1

                            })
                        );

            }

        }

        /*==================================================
            VALIDATE GALLERY SESSION ID BEFORE REQUEST
        ==================================================

            Backend requires:

                gallery.sessionId

            This prevents a malformed Complete Edit
            Intent from reaching the HTTP request.

            If the Session ID cannot be resolved from
            CarsImagesState, do NOT send an invalid
            request to the backend.
        ==================================================*/

        if (
            typeof galleryPayload.sessionId !==
                "string" ||
            !galleryPayload.sessionId.trim()
        ) {

            const error =
                new Error(
                    "Gallery edit session ID is required."
                );

            error.code =
                "INVALID_GALLERY_SESSION";

            handleError(
                error
            );

            return;

        }

        /*==================================================
            MAIN VEHICLE IMAGES PAYLOAD
        ==================================================

            Final Save Contract:

            mainImages:
                {
                    sessionId,

                    main_image:
                        {
                            action,
                            tempId
                        },

                    background_image:
                        {
                            action,
                            tempId
                        }
                }

            Actions:

                keep
                replace
                remove

            Rules:

                Existing -> Existing
                    keep

                Existing -> Temporary
                    replace + tempId

                Existing -> null
                    remove

                null -> Temporary
                    replace + tempId

                null -> null
                    keep

            The Server State is required to distinguish
            "remove" from "no image existed".
        ==================================================*/

        const mainImagesPayload =
            buildMainImagesPayload();

        if (
            !mainImagesPayload
        ) {

            return;

        }

        /*==================================================
            DISPLAY LOCATIONS PAYLOAD
        ==================================================

            Final Save Contract:

            displayLocations:
                {
                    locations:
                        [
                            {
                                location:
                                    section_slug,

                                sortOrder:
                                    integer
                            }
                        ]
                }

            Source:

                DisplayLocationsState.getWorking()

            Important:

            - State is the authority.
            - No DOM is inspected.
            - No section_id is calculated.
            - No car_id is added.
            - No page/card position is added.
            - Empty selection is valid.
            - Backend resolves section_slug to section_id.
        ==================================================*/

        const displayLocationsPayload =
            buildDisplayLocationsPayload();

        if (
            !displayLocationsPayload
        ) {

            return;

        }

        /*==================================================
            BUILD COMPLETE EDIT INTENT
        ==================================================*/

        const payload = {

            car:
                carPayload,

            gallery:
                galleryPayload,

            mainImages:
                mainImagesPayload,

            displayLocations:
                displayLocationsPayload

        };

        /*==================================================
            DEBUG
        ==================================================

            This log is intentionally kept during
            Complete Edit integration testing.

            It allows verification that the frontend
            sends the complete Edit Intent including:

                car
                gallery
                mainImages
                displayLocations
        ==================================================*/

        console.log(
            "COMPLETE EDIT SAVE INTENT:",
            payload
        );

        /*==================================================
            SAVE
        ==================================================*/

        try {

            if (setLoading) {

                setLoading(true);
            }

            /*==============================================
                COMPLETE EDIT SAVE

                IMPORTANT:

                This is the ONLY persistence request
                performed by the Edit Save workflow.

                Car update, gallery delete, gallery
                promotion, gallery reorder, Main Vehicle
                Image persistence and Display Locations
                persistence are coordinated by the backend
                CompleteEditSaveUseCase inside ONE save
                operation.
            ==============================================*/

            const response =
                await CarsEditAPI.updateCar(

                    carId,

                    payload

                );

            /*==============================================
                SUCCESS
            ==============================================*/

            if (onSuccess) {

                onSuccess(response);
            }

        } catch (error) {

            handleError(error);

        } finally {

            if (setLoading) {

                setLoading(false);
            }

        }

    }

    /*==================================================
        BUILD MAIN VEHICLE IMAGES PAYLOAD
    ==================================================

        Reads:

            MainVehicleImagesState.getServer()
            MainVehicleImagesState.getWorking()
            MainVehicleImagesState.getSessionId()

        The State module remains responsible only for
        state management.

        This function translates that state into the
        Complete Edit Save Intent contract.

        Final contract:

            mainImages: {
                sessionId,

                main_image: {
                    action,
                    tempId
                },

                background_image: {
                    action,
                    tempId
                }
            }

        No filename, storage path, MIME type or file
        metadata is sent as Save authority.
    ==================================================*/

    function buildMainImagesPayload() {

        if (
            typeof MainVehicleImagesState ===
            "undefined"
        ) {

            const error =
                new Error(
                    "MainVehicleImagesState is not loaded."
                );

            error.code =
                "MAIN_IMAGES_STATE_UNAVAILABLE";

            handleError(
                error
            );

            return null;

        }

        if (
            typeof MainVehicleImagesState
                .getServer !==
                "function" ||
            typeof MainVehicleImagesState
                .getWorking !==
                "function" ||
            typeof MainVehicleImagesState
                .getSessionId !==
                "function"
        ) {

            const error =
                new Error(
                    "MainVehicleImagesState does not expose the required Save contract."
                );

            error.code =
                "INVALID_MAIN_IMAGES_STATE_CONTRACT";

            handleError(
                error
            );

            return null;

        }

        const serverState =
            MainVehicleImagesState.getServer();

        const workingState =
            MainVehicleImagesState.getWorking();

        const sessionId =
            MainVehicleImagesState.getSessionId();

        /*==================================================
            SESSION ID
        ==================================================*/

        if (
            typeof sessionId !== "string" ||
            !sessionId.trim()
        ) {

            const error =
                new Error(
                    "Main Vehicle Images edit session ID is required."
                );

            error.code =
                "INVALID_MAIN_IMAGE_SESSION";

            handleError(
                error
            );

            return null;

        }

        /*==================================================
            BUILD SLOT INTENTS
        ==================================================*/

        const mainImage =
            buildMainImageSlotIntent(

                serverState
                    ? serverState.main_image
                    : null,

                workingState
                    ? workingState.main_image
                    : null,

                "main_image"

            );

        if (!mainImage) {

            return null;

        }

        const backgroundImage =
            buildMainImageSlotIntent(

                serverState
                    ? serverState.background_image
                    : null,

                workingState
                    ? workingState.background_image
                    : null,

                "background_image"

            );

        if (!backgroundImage) {

            return null;

        }

        return {

            sessionId:
                sessionId.trim(),

            main_image:
                mainImage,

            background_image:
                backgroundImage

        };

    }

    /*==================================================
        BUILD MAIN IMAGE SLOT INTENT
    ==================================================

        Server / Working comparison:

            Existing -> Existing
                keep

            Existing -> Temporary
                replace + tempId

            Existing -> null
                remove

            null -> Temporary
                replace + tempId

            null -> null
                keep

        A Temporary Asset is identified by its tempId.

        The backend remains authoritative for all
        temporary asset metadata.
    ==================================================*/

    function buildMainImageSlotIntent(
        serverValue,
        workingValue,
        slot
    ) {

        const hasServerImage =
            serverValue !== null &&
            typeof serverValue !==
                "undefined";

        const hasWorkingImage =
            workingValue !== null &&
            typeof workingValue !==
                "undefined";

        /*==================================================
            WORKING IMAGE REMOVED
        ==================================================*/

        if (
            !hasWorkingImage
        ) {

            /*
             * If an image existed in the server baseline,
             * null means an explicit removal.
             *
             * If no image existed in the baseline,
             * nothing needs to be changed.
             */

            if (
                hasServerImage
            ) {

                return {

                    action:
                        "remove",

                    tempId:
                        null

                };

            }

            return {

                action:
                    "keep",

                tempId:
                    null

            };

        }

        /*==================================================
            WORKING IMAGE IS TEMPORARY
        ==================================================*/

        const temporaryId =
            extractTemporaryAssetId(
                workingValue
            );

        if (
            temporaryId
        ) {

            return {

                action:
                    "replace",

                tempId:
                    temporaryId

            };

        }

        /*==================================================
            WORKING IMAGE IS EXISTING / SERVER IMAGE
        ==================================================

            Main Vehicle Images currently have no separate
            persistent identity contract in the frontend
            State beyond the server/working value.

            If the working value is not a Temporary Asset,
            there is no new file to promote.

            Therefore the Save Intent is keep.
        ==================================================*/

        return {

            action:
                "keep",

            tempId:
                null

        };

    }

    /*==================================================
        EXTRACT TEMPORARY ASSET ID
    ==================================================

        Temporary Main Image Working State is expected
        to contain the Temporary Asset returned by the
        upload workflow.

        Save authority is only the tempId.

        We intentionally do NOT send:

            originalName
            storagePath
            mimeType
            fileSize
            status
    ==================================================*/

    function extractTemporaryAssetId(
        value
    ) {

        if (
            !value ||
            typeof value !== "object" ||
            Array.isArray(value)
        ) {

            return null;

        }

        if (
            typeof value.tempId !== "string" ||
            !value.tempId.trim()
        ) {

            return null;

        }

        return value.tempId.trim();

    }

    /*==================================================
        BUILD DISPLAY LOCATIONS PAYLOAD
    ==================================================

        Reads:

            DisplayLocationsState.getWorking()

        State contract:

            [
                {
                    location:
                        section_slug,

                    sortOrder:
                        integer
                }
            ]

        Final Complete Edit contract:

            displayLocations:
            {
                locations:
                [
                    {
                        location:
                            section_slug,

                        sortOrder:
                            integer
                    }
                ]
            }

        IMPORTANT:

        DisplayLocationsState is the authority for
        current working selections.

        This function intentionally does NOT:

            - read the DOM
            - resolve section IDs
            - query the backend
            - add car_id
            - add section_id
            - add page
            - add card position
            - perform persistence

        Backend responsibilities:

            section_slug
                ↓
            site_sections.id
                ↓
            car_display_locations

        Empty selection is valid:

            []

        Therefore the payload is always sent even
        when the manager has selected no locations.
    ==================================================*/

    function buildDisplayLocationsPayload() {

        if (
            typeof DisplayLocationsState ===
                "undefined"
        ) {

            const error =
                new Error(
                    "DisplayLocationsState is not loaded."
                );

            error.code =
                "DISPLAY_LOCATIONS_STATE_UNAVAILABLE";

            handleError(
                error
            );

            return null;

        }

        if (
            typeof DisplayLocationsState
                .getWorking !==
                "function"
        ) {

            const error =
                new Error(
                    "DisplayLocationsState does not expose the required Save contract."
                );

            error.code =
                "INVALID_DISPLAY_LOCATIONS_STATE_CONTRACT";

            handleError(
                error
            );

            return null;

        }

        const workingState =
            DisplayLocationsState.getWorking();

        /*
         * The State contract guarantees an array.
         *
         * Still normalize defensively here so the
         * Complete Edit Intent never receives state
         * objects or unrelated properties.
         */

        if (
            !Array.isArray(
                workingState
            )
        ) {

            const error =
                new Error(
                    "Display Locations working state must be an array."
                );

            error.code =
                "INVALID_DISPLAY_LOCATIONS_WORKING_STATE";

            handleError(
                error
            );

            return null;

        }

        const locations = [];

        for (
            const assignment
            of workingState
        ) {

            if (
                !assignment ||
                typeof assignment !==
                    "object" ||
                Array.isArray(assignment)
            ) {

                const error =
                    new Error(
                        "Display Locations working state contains invalid assignment data."
                    );

                error.code =
                    "INVALID_DISPLAY_LOCATION_ASSIGNMENT";

                handleError(
                    error
                );

                return null;

            }

            if (
                typeof assignment.location !==
                    "string" ||
                !assignment.location.trim()
            ) {

                const error =
                    new Error(
                        "Display Location section slug is required."
                    );

                error.code =
                    "INVALID_DISPLAY_LOCATION_SECTION";

                handleError(
                    error
                );

                return null;

            }

            if (
                !Number.isInteger(
                    assignment.sortOrder
                ) ||
                assignment.sortOrder < 1
            ) {

                const error =
                    new Error(
                        "Display Location sort order must be a positive integer."
                    );

                error.code =
                    "INVALID_DISPLAY_LOCATION_SORT_ORDER";

                handleError(
                    error
                );

                return null;

            }

            locations.push({

                location:
                    assignment.location.trim(),

                sortOrder:
                    assignment.sortOrder

            });

        }

        return {

            locations

        };

    }

    /*==================================================
        RESOLVE GALLERY SESSION ID
    ==================================================

        The Complete Edit Save backend requires the
        Edit Session ID.

        Different versions of the Images State module
        may expose the session through a dedicated
        getter or through the Working State.

        Resolution order:

        1. CarsImagesState.getSessionId()
        2. CarsImagesState.getEditSessionId()
        3. workingState.sessionId
        4. workingState.editSessionId

        No new Session ID is generated here.

        The Session ID MUST belong to the current
        Edit Session and MUST be the same Session ID
        used by Temporary Gallery Uploads.
    ==================================================*/

    function resolveGallerySessionId(
        workingState
    ) {

        if (
            typeof CarsImagesState !==
                "undefined"
        ) {

            if (
                typeof CarsImagesState
                    .getSessionId ===
                    "function"
            ) {

                const sessionId =
                    CarsImagesState.getSessionId();

                if (
                    typeof sessionId ===
                        "string" &&
                    sessionId.trim()
                ) {

                    return sessionId.trim();

                }

            }

            if (
                typeof CarsImagesState
                    .getEditSessionId ===
                    "function"
            ) {

                const sessionId =
                    CarsImagesState
                        .getEditSessionId();

                if (
                    typeof sessionId ===
                        "string" &&
                    sessionId.trim()
                ) {

                    return sessionId.trim();

                }

            }

        }

        if (
            workingState &&
            typeof workingState.sessionId ===
                "string" &&
            workingState.sessionId.trim()
        ) {

            return workingState.sessionId.trim();

        }

        if (
            workingState &&
            typeof workingState.editSessionId ===
                "string" &&
            workingState.editSessionId.trim()
        ) {

            return workingState.editSessionId.trim();

        }

        return null;

    }

    /*==================================================
        ERROR
    ==================================================*/

    function handleError(error) {

        console.error(
            "Cars Edit Submit Error:",
            error
        );

        /*==============================================
            FORM ERROR MANAGER
        ==============================================*/

        if (
            typeof FormErrorManager !==
            "undefined"
        ) {

            FormErrorManager.handleBackend(
                error
            );

            return;
        }

        /*==============================================
            FALLBACK NOTIFICATION
        ==============================================*/

        if (
            typeof Notification !==
            "undefined"
        ) {

            Notification.error(

                error?.message ||
                "خطایی در ویرایش خودرو رخ داد."

            );

        }

    }

    /*==================================================
        PUBLIC
    ==================================================*/

    return {

        submit

    };

})();
