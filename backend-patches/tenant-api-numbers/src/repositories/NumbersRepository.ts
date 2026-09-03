import { randomUUID } from "crypto";
import { BaseRepository } from "@/repositories/BaseRepository";
import { toNationalDigits } from "@/schemas/Numbers";

/* Numbers the operator already holds, and the trunks they arrive on.
 *
 * Everything here is scoped by `company_uuid` in the query itself rather than
 * filtered after the fact. A number is the thing calls and money attach to, so
 * a missing tenant clause is not a leak of a list — it is one company able to
 * take another company's number off them. */
export class NumbersRepository extends BaseRepository {
    /* Which of these numbers the company already holds. Compared on the national
       ten digits so a row stored as 09876543210 and a paste of +91 98765 43210
       are recognised as the same number. */
    public async findExisting(companyUuid: string, nationals: string[]): Promise<string[]> {
        if (!nationals.length) return [];
        const rows: any[] = await this.query(
            `SELECT did_number FROM did_numbers
              WHERE company_uuid = ? AND deleted_at IS NULL`,
            [companyUuid]
        );
        const held = new Set(rows.map((row) => toNationalDigits(row?.did_number)));
        return nationals.filter((national) => held.has(national));
    }

    public async insertOwned(
        companyUuid: string,
        nationals: string[],
        label?: string,
        trunkUuid?: string
    ): Promise<number> {
        if (!nationals.length) return 0;
        const values = nationals.map((national) => [
            randomUUID(),
            companyUuid,
            `+91${national}`,
            trunkUuid || null,
            label || null,
            "carrier",
        ]);
        const result: any = await this.query(
            `INSERT INTO did_numbers
                (uuid, company_uuid, did_number, trunk_uuid, label, source)
             VALUES ?`,
            [values]
        );
        return result?.affectedRows ?? nationals.length;
    }

    public async releaseOwned(companyUuid: string, didUuid: string): Promise<boolean> {
        const result: any = await this.query(
            `UPDATE did_numbers
                SET deleted_at = NOW()
              WHERE uuid = ? AND company_uuid = ? AND deleted_at IS NULL`,
            [didUuid, companyUuid]
        );
        return (result?.affectedRows ?? 0) > 0;
    }

    /* The password column is never selected. Nothing outside this service has a
       reason to read it, and a field that is never returned cannot be leaked by
       a screen that forgot to strip it. */
    public async listTrunks(companyUuid: string): Promise<any[]> {
        return this.query(
            `SELECT uuid, name, host, port, username, proxy, \`register\`, created_at, updated_at
               FROM sip_trunk
              WHERE company_uuid = ? AND deleted_at IS NULL
              ORDER BY created_at ASC`,
            [companyUuid]
        );
    }

    public async upsertTrunk(companyUuid: string, body: any): Promise<string> {
        if (body.uuid) {
            /* The password is only written when one was supplied. An admin
               editing a trunk's name leaves the field blank, and blanking the
               stored credential there would take the trunk down. */
            const sets = [
                "name = ?",
                "host = ?",
                "port = ?",
                "username = ?",
                "proxy = ?",
                "`register` = ?",
            ];
            const params: any[] = [
                body.name,
                body.host,
                body.port ?? 5060,
                body.username || null,
                body.proxy || null,
                body.register ? 1 : 0,
            ];
            if (body.password) {
                sets.push("password = ?");
                params.push(body.password);
            }
            params.push(body.uuid, companyUuid);

            await this.query(
                `UPDATE sip_trunk SET ${sets.join(", ")}
                  WHERE uuid = ? AND company_uuid = ? AND deleted_at IS NULL`,
                params
            );
            return body.uuid;
        }

        const uuid = randomUUID();
        await this.query(
            `INSERT INTO sip_trunk
                (uuid, company_uuid, name, host, port, username, password, proxy, \`register\`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                uuid,
                companyUuid,
                body.name,
                body.host,
                body.port ?? 5060,
                body.username || null,
                body.password || null,
                body.proxy || null,
                body.register ? 1 : 0,
            ]
        );
        return uuid;
    }

    public async deleteTrunk(companyUuid: string, uuid: string): Promise<boolean> {
        const result: any = await this.query(
            `UPDATE sip_trunk SET deleted_at = NOW()
              WHERE uuid = ? AND company_uuid = ? AND deleted_at IS NULL`,
            [uuid, companyUuid]
        );
        return (result?.affectedRows ?? 0) > 0;
    }
}
