backend\models\cars\car-display-location\query\car-display-location-query.model.js
/*==================================================
    CAR DISPLAY LOCATION QUERY MODEL

    Responsibility:
    - Read-only database queries for Display Locations.
    - No HTTP awareness.
    - No business decisions.

    Transaction Contract:
    - Normal operation:
        connection = null
        -> DB Pool

    - Transactional operation:
        connection = shared connection
        -> Same transaction connection
==================================================*/

'use strict';

const BaseModel =
    require('../../../base.model');

class CarDisplayLocationQuery extends BaseModel {

    /*==============================================
        GET LOCATIONS BY CAR ID
    ==============================================*/

    static async getByCarId(
        carId,
        connection = null
    ) {

        const sql = `

            SELECT

                cdl.id,

                cdl.car_id,

                cdl.section_id,

                ss.name AS section_name,

                ss.slug AS section_slug,

                cdl.sort_order,

                cdl.created_at,

                cdl.updated_at

            FROM car_display_locations cdl

            INNER JOIN site_sections ss

                ON ss.id = cdl.section_id

            WHERE cdl.car_id = ?

            ORDER BY

                cdl.sort_order ASC,

                cdl.id ASC

        `;

        return this.findAll(

            sql,

            [carId],

            connection

        );

    }

    /*==============================================
        GET LOCATION BY ID
    ==============================================*/

    static async getById(
        id,
        connection = null
    ) {

        const sql = `

            SELECT

                id,

                car_id,

                section_id,

                sort_order,

                created_at,

                updated_at

            FROM car_display_locations

            WHERE id = ?

            LIMIT 1

        `;

        return this.findOne(

            sql,

            [id],

            connection

        );

    }

    /*==============================================
        GET LOCATIONS BY SECTION ID

        Returns the complete ordered list of a
        Display Location section.

        The section row itself is locked by
        SiteSectionQuery.getByIdForUpdate().

        This query intentionally does NOT apply
        FOR UPDATE because the section-row lock
        is the serialization primitive.
    ==============================================*/

    static async getBySectionId(
        sectionId,
        connection = null
    ) {

        const sql = `

            SELECT

                cdl.id,
                cdl.car_id,
                cdl.section_id,
                ss.name AS section_name,
                ss.slug AS section_slug,
                cdl.sort_order,
                cdl.created_at,
                cdl.updated_at

            FROM car_display_locations cdl

            INNER JOIN site_sections ss

                ON ss.id = cdl.section_id

            WHERE cdl.section_id = ?

            ORDER BY

                cdl.sort_order ASC,
                cdl.id ASC

        `;

        return this.findAll(
            sql,
            [sectionId],
            connection
        );

    }

}

module.exports = CarDisplayLocationQuery;
