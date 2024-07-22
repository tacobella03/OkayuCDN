import { join } from 'node:path';
import { USER_DATABASE_PATH, TOKEN_DATABASE_PATH, UPLOADS_PATH } from './paths';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Request, Response } from 'express';
import { matchedData } from 'express-validator';
import { TokenV2, UserModel, UserSecureData } from '../types';
import { randomBytes } from 'node:crypto';
import { hash, verify } from 'argon2';
import { Logger } from 'okayulogger';
import { toDataURL } from 'qrcode';
import { authenticator, totp } from 'otplib';
import { GenerateDefaultUserToken } from '../api/newtoken';


const L: Logger = new Logger('secure'); 

/**
 * Generate a new 32-character token.
 * @returns a cryptographically secure 32-character hexadecimal token
 */
export function CreateNewToken(): string {
    return randomBytes(16).toString('hex');
}

/**
 * Create and save a new token to the database
 * @param user UserModel of the user to register the token to.
 * @returns the generated token
 */
export function RegisterNewToken(user: UserModel): string {
    const token: string = CreateNewToken();
    const content: TokenV2 = GenerateDefaultUserToken(user.username);
    writeFileSync(join(TOKEN_DATABASE_PATH, `${token}.json`), JSON.stringify(content));
    return token;
}

/**
 * As tokens have no expiration time, this simply just checks whether the server is aware of the token.
 * @param token the user's token
 * @returns true or false whether the token is valid
 */
export function CheckToken(token: string): boolean {
    return existsSync(join(TOKEN_DATABASE_PATH, `${token}.json`));
}


/**
 * Get the correpsonding UserModel from a token
 * @param token the user's token
 * @returns UserModel of the corresponding user
 */
export function GetUserFromToken(token: string): UserModel {
    const tokenData: TokenV2 = JSON.parse(readFileSync(join(TOKEN_DATABASE_PATH, `${token}.json`), 'utf-8'));
    const tokenUser = JSON.parse(readFileSync(join(USER_DATABASE_PATH, `${tokenData.username}.json`), 'utf-8')); // read this raw because the usermodel might not be upgraded

    CheckPrivateIndex(tokenUser.username);
    
    // simple way to check if it's already stored as a new usermodel
    if (tokenUser.storageAmount != undefined) return tokenUser as UserModel;

    const model: UserModel = {
        username: tokenUser.username,
        userId: -1, // userId is -1 until implemented, if ever
        email: tokenUser.email,
        storageAmount: tokenUser.storage,
        hasLargeStorage: tokenUser.premium,
        preferences: {
            language: 0
        }
    };

    return model;
}

/**
 * Check if a user account exists in the database.
 * @param user the username/UserModel of the user we want to verify exists
 * @returns true if they exist, false otherwise
 */
export function VerifyUserExists(user: string | UserModel): boolean {
    if (typeof(user) == 'object')
        return existsSync(join(USER_DATABASE_PATH, `${user.username}.json`));
    else
        return existsSync(join(USER_DATABASE_PATH, `${user}.json`));
}

/**
 * Get the secure data (sensitive info) of a UserModel
 * @param user the UserModel of the user
 * @returns the UserSecureData associated with that UserModel
 */
export function GetSecureData(user: UserModel): UserSecureData {
    const userData = JSON.parse(readFileSync(join(USER_DATABASE_PATH, `${user.username}.json`), 'utf-8'));

    if (userData.UserModel) {
        return userData.SecureData as UserSecureData;
    }

    const SecureData: UserSecureData = {
        password: userData.password,
        password_salt: userData.password_salt || undefined, // not present if not using argon2
        passwordIsLegacy: (userData.hash_method != 'argon2'),
        two_factor: userData.uses2FA,
        twoFactorData: userData.tfa_config || undefined // not present if not using 2fa
    };

    return SecureData; 
}

/**
 * Get a UserModel from a username. This function assumes you have already checked whether the user exists in the database.
 * @param username the username of the UserModel we want to get
 * @param addSecureData add secure data to the UserModel when returned
 * @returns UserModel of the user
 */
export function GetUserModel(username: string, addSecureData: boolean = false): UserModel {
    const userData = JSON.parse(readFileSync(join(USER_DATABASE_PATH, `${username}.json`), 'utf-8'));
     
    if (!addSecureData) userData.SecureData = undefined;
    return userData as UserModel;

    // // upgrade usermodel if we need to
    // const model: UserModel = {
    //     username: username,
    //     userId: -1, // userId is -1 until implemented, if ever
    //     email: userData.email,
    //     storageAmount: userData.storage,
    //     hasLargeStorage: userData.premium,
    //     preferences: {
    //         language: 0
    //     }
    // };

    // if (addSecureData) model.SecureData = GetSecureData(model);

    // return model;
}


// /**
//  * This function should and will only be called when a user is upgrading from a pre-6.0 password which was
//  * encrypted with sha256 as opposed to argon2. The passwords are then re-encrypted and replaced with an argon2 hash.
//  * @param user UserModel of the user
//  * @param secureData UserSecureData of the user
//  * @param raw_password the unencrypted password of the user
//  * @returns true if password update was successful, false if the password is incorrect (or otherwise)
//  */
// async function UpgradeUserPassword(user: UserModel, secureData: UserSecureData, raw_password: string): Promise<boolean> {
//     return new Promise((resolve: CallableFunction) => {
//         const passwordInSHA256: string = createHash('sha256').update(raw_password).digest('hex');
//         if (passwordInSHA256 != secureData.password) {
//             resolve(false);
//             return;
//         }

//         // re-encrypt the password
//         const newPasswordSalt: string = CreateNewToken(); 

//         // this nesting is quite ugly, but it seems as if this is the only way
//         // eslint will let me to it. PR if you can fix this :3
//         hash(raw_password + newPasswordSalt).then((newHashedPassword) => {
//             secureData.password = newHashedPassword;
//             secureData.password_salt = newPasswordSalt;
//             secureData.passwordIsLegacy = false;
            
//             user.SecureData = secureData;
            
//             writeFileSync(join(USER_DATABASE_PATH, `${user.username}.json`), JSON.stringify(user), 'utf-8');
//             resolve(true);
//         });
//     });
// }

// /**
//  * Update a user's data to the new UserModel format
//  * @param username The user to upgrade
//  */
// function UpgradeToUserModel(username: string) {
//     const userData = GetUserModel(username, true); // get UserModel with secure data
//     writeFileSync(join(USER_DATABASE_PATH, `${username}.json`), JSON.stringify(userData)); // rewrite it
// }

export async function UpdateUserPassword(user: UserModel, rawNewPassword: string): Promise<boolean> {
    return new Promise((resolve: CallableFunction) => {
        try {
            const newPasswordSalt: string = CreateNewToken();
            hash(rawNewPassword + newPasswordSalt).then((newPassword) => { 
                user.SecureData!.password = newPassword;
                user.SecureData!.password_salt = newPasswordSalt;
                
                writeFileSync(join(USER_DATABASE_PATH, user.username + '.json'), JSON.stringify(user));
                
                resolve(true);
            });
        } catch (err: unknown) {
            L.error(<string> err);
            resolve(false);
        }
    });
}

/**
 * Check whether provided login credentials are correct.
 * @param username provided username
 * @param password provided password
 * @returns true if the credentials are correct, false otherwise
 */
export async function VerifyLoginCredentials(username: string, password: string): Promise<boolean> {
    return new Promise((resolve) => {

        if (!VerifyUserExists(username)) return resolve(false);
        
        const user: UserModel = GetUserModel(username, true);
        
        // since not every server will delete v3 accounts at the same time, 
        // implement handler because v4 accounts will crash without it.
        try {
            CheckPrivateIndex(user.username);

            verify(<string> user.SecureData!.password, password + user.SecureData!.password_salt).then(result => {
                return resolve(result);
            });
        } catch (err: unknown) {
            L.error('Failed to load account data. Account may be of v3 structure. These accounts are no longer supported.');
            return resolve(false);
        }

        // // we can check whether a user is legacy by checking whether they have a password in the root element
        // const data = JSON.parse(readFileSync(join(USER_DATABASE_PATH, `${username}.json`), 'utf-8'));
        // if (data.password != undefined) {
        //     UpgradeToUserModel(username);
        // }
    });
}
    


/**
 * Used to check if the user has a token (and if its valid).
 * If invalid, it will redirect the user to the login page.
 */
export const PrefersLogin = (req: Request, res: Response, next: CallableFunction) => {
    const data = matchedData(req);
    
    // validate token...
    // TokenV2 -- must validate whether a token as the "CanUseWebsite" intent
    if (!data.token || !CheckToken(data.token) || !(JSON.parse(readFileSync(join(TOKEN_DATABASE_PATH, `${data.token}.json`), 'utf-8')).intents.canUseWebsite)) {
        return res.redirect(`/login?redir=${req.originalUrl}`); 
    }

    // all is good, continue:
    next();
};


/**
 * Check whether the user has a private file data index.
 * This is required to be able to use the private files feature.
 * @param username The username to check
 */
function CheckPrivateIndex(username: string): void {
    const userPath: string = join(USER_DATABASE_PATH, username);
    if (!existsSync(userPath)) mkdirSync(userPath, {recursive:true});

    if (!existsSync(join(userPath, 'private.json'))) {
        L.info(`Creating private file index for ${username}`);
        const private_index = {
            protected_files: []
        };
        writeFileSync(join(userPath, 'private.json'), JSON.stringify(private_index), 'utf-8');
    }
}

/**
 * Check whether a file is protected (uploaded as private) by the uploader 
 * @param username The uploader of the file
 * @param filename The name of the file
 */
export function IsContentProtected(username: string, filename: string): boolean {
    CheckPrivateIndex(username);

    const privateIndexPath: string = join(USER_DATABASE_PATH, username, 'private.json');
    const data = JSON.parse(readFileSync(privateIndexPath, 'utf-8'));
    
    return (data.protected_files.indexOf(filename) != -1);
}


/**
 * Get the protected files list of a user
 * @param username The user to get
 */
export function GetProtectedFiles(username: string): Array<string> {
    CheckPrivateIndex(username);

    const privateIndexPath: string = join(USER_DATABASE_PATH, username, 'private.json');
    const data = JSON.parse(readFileSync(privateIndexPath, 'utf-8'));

    return data.protected_files;
}


/**
 * Add a file to the user's protected file index
 * @param username The user who is uploading
 * @param name The name of the file
 */
export function AddProtectedFile(username: string, name: string) {
    CheckPrivateIndex(username);

    const privateIndexPath: string = join(USER_DATABASE_PATH, username, 'private.json');
    const data = JSON.parse(readFileSync(privateIndexPath, 'utf-8'));

    data.protected_files.push(name);
    writeFileSync(privateIndexPath, JSON.stringify(data), 'utf-8');
}

/**
 * Add a file to the user's protected file index
 * @param username The user who is uploading
 * @param name The name of the file
 */
export function RemoveProtectedFile(username: string, name: string) {
    CheckPrivateIndex(username);

    const privateIndexPath: string = join(USER_DATABASE_PATH, username, 'private.json');
    const data = JSON.parse(readFileSync(privateIndexPath, 'utf-8'));

    const pos: number = data.protected_files.indexOf(name);
    if (pos == -1) return;

    data.protected_files.splice(pos, 1);

    writeFileSync(privateIndexPath, JSON.stringify(data), 'utf-8');
}


/**
 * Toggle whether a file is public or private
 * @param token The user's token
 * @param name The name of the file to change
 */
export function ChangeFileVisibility(token: string, name: string) {
    const user: UserModel = GetUserFromToken(token);
    const protected_files: Array<string> = GetProtectedFiles(user.username);

    if (protected_files.indexOf(name) != -1)
        RemoveProtectedFile(user.username, name);
    else
        AddProtectedFile(user.username, name);
}


export async function BeginTOTPSetup(user: UserModel): Promise<string> {
    const secret = authenticator.generateSecret();

    const fullUser = GetUserModel(user.username, true);

    fullUser.SecureData!.twoFactorData = {
        usesOTP: false,
        usesPasskey: false,
        PasskeyConfig: {},
        OTPConfig: {
            secret: '',
            setup: {
                data: secret
            }
        }
    };

    writeFileSync(join(USER_DATABASE_PATH, `${user.username}.json`), JSON.stringify(fullUser));
    
    return new Promise((resolve) => {
        const URI = authenticator.keyuri(user.username, 'OkayuCDN', secret);

        toDataURL(URI, (err: unknown, data_url: string) => {
            resolve(data_url);
        });
    });
}

export function CheckTOTPCode(username: string, code: number): boolean {
    const user = GetUserModel(username, true);
    console.log(code, user.SecureData!.twoFactorData!.OTPConfig!.setup!.data);

    let correct: boolean;
    try {
        correct = totp.check(code.toString(), user.SecureData!.twoFactorData!.OTPConfig!.setup!.data);
    } catch (err: unknown) {
        console.log(err);
        return false;
    }

    console.log(correct);

    return correct;
}

/**
 * Checks whether an account exists, which returns false if it does; If not, it creates a new account and returns true.
 * @param username The provided username
 * @param password The provided password
 * @param email The provided email
 * @param realname The provided real name
 * @returns true if successful, false if account already exists
 */
export function RegisterNewAccount(username: string, password: string, email: string, realname: string): Promise<boolean> {
    return new Promise((resolve) => {
        if (VerifyUserExists(username)) return resolve(false);

        const salt = CreateNewToken();
        hash(password + salt).then(hashedPassword => {
            const userData: UserModel = {
                username: username,
                userId: -1,
                email: email,
                realname: realname,
                hasLargeStorage: false,
                storageAmount: 25*1024*1024*1024, // 25gb
                preferences: {
                    language: 0
                },
                SecureData: {
                    password: hashedPassword,
                    password_salt: salt,
                    passwordIsLegacy: false,
                    two_factor: false,
                    twoFactorData: {
                        usesOTP: false,
                        usesPasskey: false,
                        OTPConfig: {
                            secret: '',
                            setup: {
                                data: ''
                            }
                        },
                        PasskeyConfig: {}
                    }
                }
            };

            writeFileSync(join(USER_DATABASE_PATH, `${username}.json`), JSON.stringify(userData));
            mkdirSync(join(UPLOADS_PATH, username));
            resolve(true);
        });
    });
}