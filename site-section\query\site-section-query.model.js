backend\models\cars\site-section\query\site-section-query.model.js
/*==================================================
    SITE SECTION QUERY MODEL

    Responsibility:

    - Read Site Section data.
    - Resolve section by ID.
    - Resolve section by slug.
    - Support normal and transactional reads.

    No:

    - HTTP
    - Business Logic
    - Persistence
    - Section assignment logic
    - Display Location logic

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

class SiteSectionQuery extends BaseModel {

    /*==============================================
        GET ALL SECTIONS

        Normal:

        getAll()

        Transactional:

        getAll(connection)
    ==============================================*/

    static async getAll(

        connection = null

    ) {

        const sql = `

            SELECT

                id,
                name,
                slug,
                description,
                display_order,
                is_active,
                created_by,
                updated_by,
                created_at,
                updated_at

            FROM site_sections

            ORDER BY

                display_order ASC,
                id ASC

        `;

        return this.findAll(

            sql,

            [],

            connection

        );

    }

    /*==============================================
        GET SECTION BY ID

        Normal:

        getById(id)

        Transactional:

        getById(id, connection)
    ==============================================*/

    static async getById(

        id,
        connection = null

    ) {

        const sql = `

            SELECT

                id,
                name,
                slug,
                description,
                display_order,
                is_active,
                created_by,
                updated_by,
                created_at,
                updated_at

            FROM site_sections

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
        GET SECTION BY ID FOR UPDATE

        Transactional ONLY

        getByIdForUpdate(
            id,
            connection
        )

        Purpose:

        - Lock the section row inside the
          current transaction.
        - Serialize Display Location mutations
          for this section.
        - Prevent concurrent transactions from
          modifying the same section ordering
          simultaneously.

        Requirements:

        - A transaction connection is mandatory.
        - Uses SELECT ... FOR UPDATE.
        - Must participate in the caller's
          existing transaction.

        No:

        - New transaction
        - Connection acquisition
        - Business logic
        - Display Location logic
    ==============================================*/

    static async getByIdForUpdate(

        id,
        connection

    ) {

        if (!connection) {

            throw new Error(

                'A transaction connection is required for getByIdForUpdate().'

            );

        }

        const sql = `

            SELECT

                id,
                name,
                slug,
                description,
                display_order,
                is_active,
                created_by,
                updated_by,
                created_at,
                updated_at

            FROM site_sections

            WHERE id = ?

            LIMIT 1

            FOR UPDATE

        `;

        return this.findOne(

            sql,

            [id],

            connection

        );

    }

    /*==============================================
        GET SECTION BY SLUG

        Normal:

        getBySlug(slug)

        Transactional:

        getBySlug(slug, connection)

        IMPORTANT:

        Display Locations Save uses section_slug

        as its frontend/domain representation.

        The Complete Edit Save Use Case must resolve:

        section_slug
        ↓
        site_sections.id

        inside the SAME transaction connection.
    ==============================================*/

    static async getBySlug(

        slug,
        connection = null

    ) {

        const sql = `

            SELECT

                id,
                name,
                slug,
                description,
                display_order,
                is_active

            FROM site_sections

            WHERE slug = ?

            LIMIT 1

        `;

        return this.findOne(

            sql,

            [slug],

            connection

        );

    }

}

module.exports =
    SiteSectionQuery;
