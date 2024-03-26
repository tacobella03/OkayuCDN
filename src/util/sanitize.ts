// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Request, Response } from 'express';
import { error } from 'okayulogger';
import { cookie, header, body, query, param, validationResult } from 'express-validator';

export const ValidateContentRequest = () => [
    param('user').notEmpty().escape(),
    param('item').notEmpty().escape()
];

export const ValidateToken = () => cookie('cookie').notEmpty().escape().isLength({min:32,max:32});
export const ValidateHeaderToken = () => header('authorization').notEmpty().escape().isLength({min:32,max:32});
export const ValidateLoginGET = () => [
    query('redir').optional().escape(),
];
export const ValidateLoginPOST = () => [
    body('username').notEmpty().escape(),
    body('password').notEmpty().escape()
];


export const HandleBadRequest = (req: Request, res: Response, next: CallableFunction) => {
    if (!validationResult(req).isEmpty()) {
        error('sanitize', 'bad request, rejecting.');
        res.status(400).send('Bad request, please modify your request and try again.');
        return;
    }

    next();
};