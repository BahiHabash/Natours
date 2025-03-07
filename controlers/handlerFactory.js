const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');


exports.create = Model => catchAsync(async (req, res, next) => {
    const newDocument = await Model.create(req.body);

    res.status(201).json({
        status: 'success',
        data: {
            data: newDocument
        } 
    })
});

exports.updateOne = Model => catchAsync(async (req, res, next) => {
    const document = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        upsert: true,
        runValidators: true
    });

    if (!document) {
        return next( new AppError(`No Document Found With Thad ID`, 404) );
    }

    res.status(200).json({
        status: 'success', 
        result: document.length,
        data: {
            data: document
        }
    });
});

exports.deleteOne = Model => catchAsync(async (req, res, next) => {
    if (! await Model.findByIdAndDelete(req.params.id) ) {
        return next( new AppError(`No Document Found With Thad ID`, 404) );
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});

exports.getOne = (Model, populateOptions) => catchAsync(async (req, res, next) => {
    const query = Model.findById(req.params.id);
    if (populateOptions) query.populate(populateOptions);

    const document = await query;

    if (!document) {
        next(new AppError(`No such Document with that id: ${req.params.id}`, 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            data: document
        }
    });
});

exports.getAll = Model => catchAsync(async (req, res, next) => {
    const features = new APIFeatures(Model.find(), req.query)
        .filter()
        .sort()
        .limitFields()
        .pagenate();

    const documents = await features.query;

    res.status(201).json({
        status: 'success', 
        result: documents.length,
        data: {
            data: documents
        }
    });
});
