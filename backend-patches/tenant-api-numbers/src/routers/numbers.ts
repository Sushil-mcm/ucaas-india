import { Router } from "express";
import { Routes } from "@/interfaces/RoutesInterface";
import { TenantAuthMiddleware } from "@/middlewares/TenantAuthMiddleware";
import Validator from "@/middlewares/TenantValidator";
import { NumbersController } from "@/controllers/NumbersController";
import {
    deleteTrunk,
    registerNumbers,
    releaseNumber,
    upsertTrunk,
} from "@/schemas/Numbers";

/* Mounted at /api/numbers rather than this service's usual /api/v1 because that
   is the path the front end already uses for the number list, and splitting one
   screen's calls across two prefixes to suit which service happens to answer
   them would be an odd thing to make anybody remember.
 *
 * nginx sends only /api/numbers/register, /api/numbers/release and
 * /api/numbers/trunk/* here; /api/numbers/list stays on default-api. See
 * nginx/numbers-to-tenant-api.conf. */
export class NumbersRoute implements Routes {
    public path = "/api/numbers";
    public router = Router();
    public numbers = new NumbersController();

    constructor() {
        this.initRoutes();
    }

    private initRoutes() {
        this.router.post(
            `${this.path}/register`,
            TenantAuthMiddleware,
            Validator(registerNumbers),
            this.numbers.register
        );
        this.router.post(
            `${this.path}/release`,
            TenantAuthMiddleware,
            Validator(releaseNumber),
            this.numbers.release
        );
        this.router.post(`${this.path}/trunk/list`, TenantAuthMiddleware, this.numbers.trunkList);
        this.router.post(
            `${this.path}/trunk/upsert`,
            TenantAuthMiddleware,
            Validator(upsertTrunk),
            this.numbers.trunkUpsert
        );
        this.router.post(
            `${this.path}/trunk/delete`,
            TenantAuthMiddleware,
            Validator(deleteTrunk),
            this.numbers.trunkDelete
        );
        this.router.post(`${this.path}/trunk/status`, TenantAuthMiddleware, this.numbers.trunkStatus);
    }
}
