backend\models\cars\car-display-location\car-display-location.model.js
/*==================================================
    CAR DISPLAY LOCATION MODEL (FACADE)

    Responsibility:
    - Route Display Location operations to the
      appropriate Query / Public / Admin model.
    - Pass the optional transaction connection through.

    Business Logic:
    - None.

    Transaction Contract:
    - Normal operation:
        connection = null
        -> DB Pool

    - Transactional operation:
        connection = shared connection
        -> Same transaction connection is propagated
==================================================*/

'use strict';

const CarDisplayLocationQuery =
    require('./query/car-display-location-query.model');

const CarDisplayLocationPublic =
    require('./public/car-display-location-public.model');

const CarDisplayLocationAdmin =
    require('./admin/car-display-location-admin.model');

class CarDisplayLocation {

    /*==============================================
        QUERY METHODS
    ==============================================*/

    static async getByCarId(
        carId,
        connection = null
    ) {

        return CarDisplayLocationQuery.getByCarId(
            carId,
            connection
        );

    }

    static async getById(
        id,
        connection = null
    ) {

        return CarDisplayLocationQuery.getById(
            id,
            connection
        );

    }

    /*==============================================
        PUBLIC METHODS
    ==============================================*/

    static async getBySectionSlug(
        slug,
        connection = null
    ) {

        return CarDisplayLocationPublic.getBySectionSlug(
            slug,
            connection
        );

    }

    /*==============================================
        ADMIN METHODS
    ==============================================*/

    static async create(
        data,
        connection = null
    ) {

        return CarDisplayLocationAdmin.create(
            data,
            connection
        );

    }

    static async update(
        id,
        data,
        connection = null
    ) {

        return CarDisplayLocationAdmin.update(
            id,
            data,
            connection
        );

    }

    static async delete(
        id,
        connection = null
    ) {

        return CarDisplayLocationAdmin.delete(
            id,
            connection
        );

    }

    /*==============================================
        REPLACE ALL LOCATIONS FOR CAR
    ==============================================*/

    static async replaceForCar(
        carId,
        assignments,
        connection = null
    ) {

        return CarDisplayLocationAdmin.replaceForCar(
            carId,
            assignments,
            connection
        );

    }

}

module.exports =
    CarDisplayLocation;
