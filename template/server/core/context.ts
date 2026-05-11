import AuthModel from './models/auth.js';
import UserModel from './models/user.js';
import AccountModel from './models/account.js';
import BaseModel from './models/base.js';
import Db from './db.js';

class Context {
    auth: AuthModel;
    user: UserModel;
    account: AccountModel;

    // Add new models here as the project grows:
    // company: CompanyModel;
    // employee: EmployeeModel;
    // document: DocumentModel;

    constructor() {
        this.auth = new AuthModel(this);
        this.user = new UserModel(this);
        this.account = new AccountModel(this);
    }

    async knexTransaction(fn: () => Promise<void>): Promise<void> {
        const db = new Db();
        const { knex } = db;

        try {
            await knex.transaction(async (trx) => {
                for (const key in this) {
                    const model = (this as any)[key];
                    if (model instanceof BaseModel) {
                        model.knex = trx;
                    }
                }

                await fn();
            });
        } finally {
            for (const key in this) {
                const model = (this as any)[key];
                if (model instanceof BaseModel) {
                    model.knex = knex;
                }
            }
        }
    }
}

export default Context;
