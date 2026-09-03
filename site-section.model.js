backend\models\cars\site-section\site-section.model.js
/*==================================================
    SITE SECTION MODEL (FACADE)

    Responsibility:
    - Route Site Section operations to the
      appropriate Query / Public / Admin model.
    - Pass the optional transaction connection
      through for transactional query operations.

    Business Logic:
    - None.

==================================================*/

'use strict';

const SiteSectionQuery =
    require('./query/site-section-query.model');

const SiteSectionPublic =
    require('./public/site-section-public.model');

const SiteSectionAdmin =
    require('./admin/site-section-admin.model');

class SiteSection {

    /*==============================================
        QUERY METHODS
    ==============================================*/

    static async getAll() {

        return SiteSectionQuery.getAll();

    }

    static async getById(
        id,
        connection = null
    ) {

        return SiteSectionQuery.getById(
            id,
            connection
        );

    }

    /*==============================================
        GET SECTION BY SLUG
    ==============================================*/

    static async getBySlug(
        slug,
        connection = null
    ) {

        return SiteSectionQuery.getBySlug(
            slug,
            connection
        );

    }

    /*==============================================
        PUBLIC METHODS
    ==============================================*/

    static async getActive() {

        return SiteSectionPublic.getActive();

    }

    /*==============================================
        ADMIN METHODS
    ==============================================*/

    static async create(data) {

        return SiteSectionAdmin.create(data);

    }

    static async update(
        id,
        data
    ) {

        return SiteSectionAdmin.update(
            id,
            data
        );

    }

    static async delete(id) {

        return SiteSectionAdmin.delete(id);

    }

}

module.exports = SiteSection;
backend\models\cars\site-section\shared\allowed-fields.js
/*==================================================
    SITE SECTION ALLOWED FIELDS
==================================================*/

module.exports = [
    'name',
    'slug',
    'description',
    'display_order',
    'is_active',
    'updated_by'
];
