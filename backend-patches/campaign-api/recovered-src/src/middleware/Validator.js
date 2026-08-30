{
Object.defineProperty(exports, "__esModule", ({ value: true }));
const Validator = (schema, property) => {
    return async (req, res, next) => {
        try {
            await schema.validateAsync(req[property], { abortEarly: false });
            next();
        }
        catch (error) {
            const errors = error.details ? error.details[0].message : error?.message?.replace(/\s?\(.*\)/g, ''); // replace(/\s?\(.*\)/g, '') used for remove parentheses of DB validations word 
            res.status(422).json({ error: { message: errors } });
        }
    };
};
exports["default"] = Validator;


//# sourceURL=webpack://campaign-api/./src/middleware/Validator.ts?
}