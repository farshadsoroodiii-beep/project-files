backend\controllers\admin\cars\cars.controller.js
/*==================================================
    ADMIN CAR CONTROLLER (V1.2)

    Vehicle Management API
    Admin Panel

==================================================*/

const Car =
    require('../../../models/cars/car.model.js');

const CompleteEditSaveUseCase =
    require('../../../use-cases/admin/cars/complete-edit-save.use-case');

const {
    validateCreateCar
} = require('../../../validators/cars');

const {
    generateCarCode
} = require('../../../utils/car-code-generator.util');

const {
    handleDatabaseError
} = require('../../../utils/database-error.util');

class AdminCarController {

    /*==============================================
        GET ALL CARS

        GET /api/admin/cars

        Admin List
    ==============================================*/
    static async getCars(req, res) {

        try {

            const {

                page = 1,

                limit = 10,

                search = '',

                brand = '',

                condition = '',

                status = ''

            } = req.query;

            const options = {

                page: Number(page),

                limit: Number(limit),

                search,

                brand,

                condition,

                status

            };

            const result =
                await Car.getAll(options);

            return res.status(200).json({

                success: true,

                data: result.cars,

                pagination: {

                    page: result.page,

                    limit: result.limit,

                    total: result.total,

                    totalPages: result.totalPages

                }

            });

        }

        catch (error) {

            console.error(

                'ADMIN GET CARS ERROR:',

                error

            );

            return handleDatabaseError(
                res,
                error
            );

        }

    }

    /*==============================================
        GET CAR DETAILS

        GET /api/admin/cars/:id

        Includes:

        - Car
        - Gallery
        - Locations

    ==============================================*/
    static async getCarById(req, res) {

        try {

            const { id } =
                req.params;

            const car =
                await Car.getAdminDetails(id);

            if (!car) {

                return res.status(404).json({

                    success: false,

                    message: 'Car not found.'

                });

            }

            return res.status(200).json({

                success: true,

                data: car

            });

        }

        catch (error) {

            console.error(

                'ADMIN GET CAR ERROR:',

                error

            );

            return handleDatabaseError(
                res,
                error
            );

        }

    }

    /*==============================================
        CREATE CAR

        POST /api/admin/cars

    ==============================================*/
    static async createCar(req, res) {

        try {

            const data = {
                ...req.body
            };

            const validationResult =
                validateCreateCar(data);

            if (
                validationResult.hasErrors()
            ) {

                return res
                    .status(400)
                    .json(
                        validationResult.toJSON()
                    );

            }

            data.car_code =
                await generateCarCode();

            const carId =
                await Car.create(data);

            return res.status(201).json({

                success: true,

                message:
                    'Car created successfully.',

                data: {

                    id: carId

                }

            });

        }

        catch (error) {

            console.error(

                'CREATE CAR ERROR:',

                error

            );

            return handleDatabaseError(
                res,
                error
            );

        }

    }

    /*==============================================
        UPDATE CAR / COMPLETE EDIT SAVE

        PUT /api/admin/cars/:id

        Complete Edit Intent:

        - Car Data
        - Gallery Order
        - Gallery Delete

        Persistence is coordinated by:

        CompleteEditSaveUseCase

        The Use Case owns the business
        transaction boundary.

        IMPORTANT:

        Controller does NOT:
        - Update the car directly
        - Reorder gallery directly
        - Delete gallery images directly
        - Manage transactions

        All complete-save persistence is
        delegated to the Use Case.
    ==============================================*/
    static async updateCar(req, res) {

        try {

            const { id } =
                req.params;

            const result =
                await CompleteEditSaveUseCase.execute(

                    id,

                    req.body

                );

            return res.status(200).json({

                success: true,

                message:
                    'Car updated successfully.',

                data: result

            });

        }

        catch (error) {

            console.error(

                'UPDATE CAR ERROR:',

                error

            );

            return handleDatabaseError(
                res,
                error
            );

        }

    }

    /*==============================================
        DELETE CAR

        DELETE /api/admin/cars/:id

    ==============================================*/
    static async deleteCar(req, res) {

        try {

            const { id } =
                req.params;

            const result =
                await Car.delete(id);

            return res.status(200).json({

                success: true,

                message:
                    'Car deleted successfully.',

                data: result

            });

        }

        catch (error) {

            console.error(

                'DELETE CAR ERROR:',

                error

            );

            return handleDatabaseError(
                res,
                error
            );

        }

    }

}

module.exports =
    AdminCarController;
