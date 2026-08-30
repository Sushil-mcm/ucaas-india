import getSequelizeInstance from "@/config/database";
import {
    COMPANY_DEFAULT_TEMPLATE_NAME,
    invalidateCompanyDefaults,
    withCompanyDefaultRow,
} from "@/helpers/companyDefaults";
import { User } from "@/globalRequest";
import { IUserTemplate, IUserTemplateBody } from "@/interfaces/requests/IUserTemplateInterface";
import { UserTemplate } from "@/models/UserTemplateModel";
import { Op } from "sequelize";

export class UserTemplateRepository {

    static list = async (tenantDbName: string, request: IUserTemplate, authUser: User): Promise<any> => {
        try {
            const sequelizeInstance = getSequelizeInstance(tenantDbName);

            const UserTemplateModel = UserTemplate(sequelizeInstance);

            const { limit = 100, page = 1, sort, filter = [] } = request;

            const offset = (page - 1) * limit;

            const where = {
                created_by: authUser.userUuid
            };

            if (filter.length) {
                filter.forEach(({ key, value }: { key: string, value: string }): void => {
                    if (key === 'name') {
                        where[key] = { [Op.like]: `%${value}%` }
                    } else {
                        where[key] = value
                    }
                })
            }

            const queryObject: any = { where, limit, offset, order: [[sort?.key ?? "created_at", sort?.desc ?? "desc"]] };

            const { count, rows } = await UserTemplateModel.findAndCountAll(queryObject);

            /* The company's own rules live on one reserved row called
               "Company Default". The query above only returns rows the person
               asking created, which is right for the presets people make for
               themselves and wrong for a rule that belongs to the company: a
               second admin saw nothing, was told nothing had been saved, and
               saved a second copy. Two of the nineteen live companies already
               have their rules split across two rows because of this.

               withCompanyDefaultRow folds every copy into one and puts it in the
               list for everybody, so every admin edits the same record and the
               next save heals the split. It only ever adds or replaces a row,
               never removes one, and never throws — so if it cannot read, the
               list comes back exactly as it would have. */
            const nameFilter = (filter || []).find(
                (entry: any) => entry && entry.key === "name",
            )?.value;

            const withCompanyRow = await withCompanyDefaultRow(
                tenantDbName,
                rows as any[],
                page,
                nameFilter,
            );

            const totalItems = count + withCompanyRow.added;
            const totalPages = Math.ceil(totalItems / limit);

            return {
                limit,
                currentPage: page,
                totalItems,
                totalPages,
                rows: withCompanyRow.rows,
            };
        } catch (error) {
            console.error("Error fetching users:", error);
            throw new Error(`Failed to fetch record info. ${error?.message}`);
        }
    }

    static upsert = async (tenantDbName: string, request: IUserTemplateBody, authUser: User): Promise<any> => {
        try {
            const sequelizeInstance = getSequelizeInstance(tenantDbName);

            const UserTemplateModel = UserTemplate(sequelizeInstance);

            const { uuid = null, name, greetings, settings } = request;

            /* The company's rules are held in memory for a minute so they are not
               re-read on every request. Forgetting them here is what stops an
               admin saving a change and then not seeing it take effect for the
               next minute. Cheap, and only ever costs one extra read. */
            const touchesCompanyRules = String(name || "") === COMPANY_DEFAULT_TEMPLATE_NAME || !!uuid;

            let record = null;
            if (uuid) {
                await UserTemplateModel.update({ name, greetings, settings }, { where: { uuid } });
                if (touchesCompanyRules) invalidateCompanyDefaults(tenantDbName);
                return { uuid }
            } else {
                record = await UserTemplateModel.create({ name, greetings, settings, created_by: authUser?.userUuid ?? "" });
            }

            if (touchesCompanyRules) invalidateCompanyDefaults(tenantDbName);

            return record;
        } catch (error) {
            if (error.name === "SequelizeUniqueConstraintError") {
                // Handle Sequelize unique constraint errors
                const uniqueField = error.errors?.[0]?.path; // Field causing the error
                const errorMessage = uniqueField
                    ? `${uniqueField} must be unique.`
                    : "A unique constraint error occurred.";
                throw new Error(errorMessage);
            }
            console.error("Error fetching users:", error);
            throw new Error(`Failed to fetch record info. ${error?.message}`);
        }
    }

    static remove = async (tenantDbName: string, uuid: string): Promise<any> => {
        try {
            const sequelizeInstance = getSequelizeInstance(tenantDbName);

            const handlingModel = UserTemplate(sequelizeInstance);

            let response = await handlingModel.destroy({
                where: { uuid },
            });

            /* A deleted row might have been the company's rules, and this is not
               able to tell after the fact, so the held copy is forgotten either
               way. The cost of being wrong is one extra database read. */
            invalidateCompanyDefaults(tenantDbName);

            return response;
        } catch (error) {
            console.error("Error fetching users:", error);
            throw new Error(`Failed to fetch handling info. ${error?.message}`);
        }
    }

    static info = async (tenantDbName: string, uuid: string): Promise<any> => {
        try {
            const sequelizeInstance = getSequelizeInstance(tenantDbName);

            const UserTemplateModel = UserTemplate(sequelizeInstance);

            let response = await UserTemplateModel.findOne({ where: { uuid } });
            return { response };
        } catch (error) {
            console.error("Error fetching users:", error);
            throw new Error(`Failed to fetch record info. ${error?.message}`);
        }
    }
}
