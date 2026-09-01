backend\models\cars\car-display-location\admin\car-display-location-admin.model.js
/*==================================================
    CAR DISPLAY LOCATION ADMIN MODEL

    Responsibility:
    - Database persistence for Admin Display Location
      operations.
    - No HTTP awareness.
    - No business decisions.
    - No section slug resolution.

    Transaction Contract:
    - Normal operation:
        connection = null
        -> DB Pool

    - Transactional operation:
        connection = shared connection
        -> Same transaction connection

    Complete Edit Save:

        replaceForCar()
            ↓
        Delete current assignments
            ↓
        Insert final assignments

    The entire operation participates in the
    Complete Edit Save transaction.

==================================================*/

'use strict';

const BaseModel =
    require('../../../base.model');

const allowedFields =
    require('../shared/allowed-fields');

class CarDisplayLocationAdmin extends BaseModel {

    static allowedFields = allowedFields;

    /*==============================================
        CREATE LOCATION
    ==============================================*/

    static async create(
        data,
        connection = null
    ) {

        const sql = `

            INSERT INTO car_display_locations (

                car_id,

                section_id,

                sort_order

            )

            VALUES (?, ?, ?)

        `;

        const result =
            await this.execute(

                sql,

                [

                    data.car_id,

                    data.section_id,

                    data.sort_order ?? 1

                ],

                connection

            );

        return result.insertId;

    }

    /*==============================================
        UPDATE LOCATION
    ==============================================*/

    static async update(
        id,
        data,
        connection = null
    ) {

        const { fields, values } =
            this.buildUpdateFields(

                data,

                this.allowedFields

            );

        if (
            fields.length === 0
        ) {

            throw new Error(
                'No valid fields to update.'
            );

        }

        values.push(
            id
        );

        const sql = `

            UPDATE car_display_locations

            SET ${fields.join(', ')}

            WHERE id = ?

        `;

        return this.execute(

            sql,

            values,

            connection

        );

    }

    /*==============================================
        DELETE LOCATION
    ==============================================*/

    static async delete(
        id,
        connection = null
    ) {

        const sql = `

            DELETE FROM car_display_locations

            WHERE id = ?

        `;

        return this.execute(

            sql,

            [id],

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

        /*==========================================
            DELETE CURRENT ASSIGNMENTS
        ==========================================*/

        const deleteSql = `

            DELETE FROM car_display_locations

            WHERE car_id = ?

        `;

        await this.execute(

            deleteSql,

            [carId],

            connection

        );

        /*==========================================
            NOTHING TO INSERT
        ==========================================*/

        if (
            !assignments.length
        ) {

            return {

                deleted: true,

                inserted: 0

            };

        }

        /*==========================================
            BUILD BULK INSERT
        ==========================================*/

        const placeholders =
            assignments
                .map(
                    () =>
                        '(?, ?, ?)'
                )
                .join(', ');

        const values = [];

        for (
            const assignment
            of assignments
        ) {

            values.push(

                carId,

                assignment.section_id,

                assignment.sort_order

            );

        }

        const insertSql = `

            INSERT INTO car_display_locations (

                car_id,

                section_id,

                sort_order

            )

            VALUES ${placeholders}

        `;

        const result =
            await this.execute(

                insertSql,

                values,

                connection

            );

        return {

            deleted: true,

            inserted:
                result.affectedRows

        };

    }

}

module.exports =
    CarDisplayLocationAdmin;
