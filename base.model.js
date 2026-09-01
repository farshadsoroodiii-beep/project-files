backend\models\base.model.js
/*==================================================
    BASE MODEL (V1.1)
    Shared Database Layer

    Connection-aware persistence:
    - Normal mode  -> DB Pool
    - Transaction  -> Shared Connection
==================================================*/

const db = require('../config/db');

class BaseModel {

    /*==============================================
        SELECT QUERY

        Normal:
            DB Pool

        Transactional:
            Shared Connection
    ==============================================*/
    static async query(
        sql,
        params = [],
        connection = null
    ) {

        const executor = connection || db;

        const [rows] =
            await executor.query(
                sql,
                params
            );

        return rows;

    }

    /*==============================================
        INSERT / UPDATE / DELETE

        Normal:
            DB Pool

        Transactional:
            Shared Connection
    ==============================================*/
    static async execute(
        sql,
        params = [],
        connection = null
    ) {

        const executor = connection || db;

        const [result] =
            await executor.execute(
                sql,
                params
            );

        return result;

    }

    /*==============================================
        FIND MULTIPLE ROWS
    ==============================================*/
    static async findAll(
        sql,
        params = [],
        connection = null
    ) {

        return this.query(
            sql,
            params,
            connection
        );

    }

    /*==============================================
        FIND SINGLE ROW
    ==============================================*/
    static async findOne(
        sql,
        params = [],
        connection = null
    ) {

        const rows =
            await this.query(
                sql,
                params,
                connection
            );

        return rows.length
            ? rows[0]
            : null;

    }

    /*==============================================
        DATABASE TRANSACTION

        Owns:
        - Connection
        - BEGIN
        - COMMIT
        - ROLLBACK

        The connection is passed to the callback.
    ==============================================*/
    static async transaction(callback) {

        const connection =
            await db.getConnection();

        try {

            await connection.beginTransaction();

            const result =
                await callback(connection);

            await connection.commit();

            return result;

        } catch (error) {

            await connection.rollback();

            throw error;

        } finally {

            connection.release();

        }

    }

    /*==============================================
        BUILD SAFE UPDATE FIELDS

        Creates UPDATE clause using whitelist
    ==============================================*/
    static buildUpdateFields(
        data = {},
        allowedFields = []
    ) {

        const fields = [];
        const values = [];

        for (const field of allowedFields) {

            if (
                Object.prototype.hasOwnProperty.call(
                    data,
                    field
                ) &&
                data[field] !== undefined
            ) {

                fields.push(
                    `\`${field}\` = ?`
                );

                values.push(
                    data[field]
                );

            }

        }

        return {
            fields,
            values
        };

    }

}

module.exports = BaseModel;
