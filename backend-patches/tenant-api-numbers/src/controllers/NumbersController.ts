import { Response } from "express";
import { BaseController } from "@/controllers/BaseController";
import { GlobalRequest } from "@/globalRequest";
import { ResponseModel } from "@/controllers/ResponseModel";
import { NumbersRepository } from "@/repositories/NumbersRepository";
import { toNationalDigits } from "@/schemas/Numbers";

/* Numbers the operator brought with them, and the trunk they arrive on.
 *
 * Nothing here talks to a carrier. The numbers already belong to the account —
 * a +91 range is issued to a licensed Indian operator and cannot be bought
 * through this product — so registering one is telling the switch to answer for
 * it, and releasing one is telling it to stop. */
export class NumbersController extends BaseController {
    private repo = new NumbersRepository();

    public register = async (req: GlobalRequest, res: Response) => {
        const companyUuid = req.user?.company_uuid;
        if (!companyUuid) return ResponseModel.unauthorized(res);

        const { numbers, label, trunk_uuid } = req.body;

        /* De-duplicated inside the request as well as against the account: a
           paste with the same number twice must not insert it twice. */
        const nationals = Array.from(
            new Set((numbers as string[]).map(toNationalDigits).filter(Boolean))
        );

        const already = await this.repo.findExisting(companyUuid, nationals);
        const fresh = nationals.filter((n) => !already.includes(n));
        const added = await this.repo.insertOwned(companyUuid, fresh, label, trunk_uuid);

        /* The already-held ones are reported, not treated as an error. Pasting a
           list that overlaps what you have is ordinary, and refusing the whole
           batch for it would make an admin diff the list by hand. */
        return ResponseModel.success(res, {
            message: added
                ? `${added} number${added === 1 ? "" : "s"} added.`
                : "Those numbers are already on the account.",
            result: {
                added,
                already_registered: already.map((n) => `+91${n}`),
            },
        });
    };

    public release = async (req: GlobalRequest, res: Response) => {
        const companyUuid = req.user?.company_uuid;
        if (!companyUuid) return ResponseModel.unauthorized(res);

        const removed = await this.repo.releaseOwned(companyUuid, req.body.did_uuid);
        if (!removed) return ResponseModel.notFound(res, "That number is not on this account.");

        return ResponseModel.success(res, {
            message: "Number removed. Your carrier still holds the range.",
            result: { released: true },
        });
    };

    public trunkList = async (req: GlobalRequest, res: Response) => {
        const companyUuid = req.user?.company_uuid;
        if (!companyUuid) return ResponseModel.unauthorized(res);

        const rows = await this.repo.listTrunks(companyUuid);

        /* `registration_state` is reported as unknown rather than guessed from
           the stored `register` flag. Nothing here has yet asked FreeSWITCH what
           the gateway is actually doing (see this patch's README), and a screen
           that says "Registered" because a checkbox is ticked would be telling
           an admin their calls work when they may not. */
        return ResponseModel.success(res, {
            message: "Success",
            result: {
                rows: rows.map((row) => ({ ...row, registration_state: "UNKNOWN" })),
            },
        });
    };

    public trunkUpsert = async (req: GlobalRequest, res: Response) => {
        const companyUuid = req.user?.company_uuid;
        if (!companyUuid) return ResponseModel.unauthorized(res);

        const uuid = await this.repo.upsertTrunk(companyUuid, req.body);

        return ResponseModel.success(res, {
            message: req.body.uuid ? "Trunk saved." : "Trunk added.",
            result: { uuid },
        });
    };

    public trunkDelete = async (req: GlobalRequest, res: Response) => {
        const companyUuid = req.user?.company_uuid;
        if (!companyUuid) return ResponseModel.unauthorized(res);

        const removed = await this.repo.deleteTrunk(companyUuid, req.body.uuid);
        if (!removed) return ResponseModel.notFound(res, "That trunk is not on this account.");

        return ResponseModel.success(res, { message: "Trunk removed.", result: { deleted: true } });
    };

    /* Deliberately the same answer as trunkList until the FreeSWITCH read
       exists. Kept as its own route so the front end has somewhere to poll once
       it does, rather than needing a new endpoint later. */
    public trunkStatus = async (req: GlobalRequest, res: Response) => {
        const companyUuid = req.user?.company_uuid;
        if (!companyUuid) return ResponseModel.unauthorized(res);

        const rows = await this.repo.listTrunks(companyUuid);
        const wanted = req.body?.uuid
            ? rows.filter((row) => row.uuid === req.body.uuid)
            : rows;

        return ResponseModel.success(res, {
            message: "Success",
            result: {
                rows: wanted.map((row) => ({
                    uuid: row.uuid,
                    registration_state: "UNKNOWN",
                })),
            },
        });
    };
}
