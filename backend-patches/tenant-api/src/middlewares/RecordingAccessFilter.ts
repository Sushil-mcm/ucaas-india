/* Stop a recording's file name leaving this service when the company has said it
 * should not.
 *
 * WHY IT SITS HERE AND NOT IN EACH CONTROLLER
 *
 * The name of a recording file appears in the answers to roughly a dozen
 * different endpoints — call history, the call list, inbound, outbound,
 * voicemail, the recording report, a single call by its id, and more. It is set
 * in six different places inside one three-and-a-half-thousand line file. Adding
 * the same check to each of those places would work until somebody adds a
 * thirteenth endpoint, and then the file name would quietly start leaking again.
 *
 * One gate on the way out cannot be forgotten. Anything that leaves this service
 * carrying a recording file name passes through here.
 *
 * WHAT IT COSTS WHEN NOBODY HAS SET ANYTHING
 *
 * Almost nothing, which is the point. The first thing it does is ask whether this
 * company has switched either answer off. For every company that has never opened
 * the Policies screen the answer is no, and the request carries on completely
 * untouched — same answer, same shape, same code path as today. The company's
 * rules are held for a minute, so the usual cost is one lookup in memory.
 *
 * Only when an admin has deliberately switched something off does the rest of
 * this file run.
 *
 * WHAT IT DOES NOT DO
 *
 * It does not stop somebody who already has the audio address. The recordings are
 * served by a different service from a plain address, and that service does not
 * ask who is requesting. Anybody holding an old link can still play the file.
 * Closing that is a separate job on the media service. What this buys is real but
 * bounded: the admin's decision stops being decorative, and the file name stops
 * being handed to people the company said should not have it.
 */

import express, { NextFunction, Response } from "express";

import { readCompanyDefaults } from "@/helpers/companyDefaults";
import {
    isRecordingAccessRestricted,
    normalizeExtension,
    readRecordingAccessPolicy,
    scrubRecordings,
} from "@/helpers/recordingAccess";

/* The role name the website treats as an admin. Kept as one value on purpose:
   the browser copy of this rule tests `role === 'ADMIN'` and nothing else, and
   the two must give the same answer or somebody sees a play button that plays
   nothing. */
const ADMIN_ROLE = "ADMIN";

/* A quick look for this word in the finished answer decides whether the answer is
   worth taking apart at all. Every response that can carry a recording contains
   it; the great majority of responses do not. */
const RECORDING_MARKER = "recording_file";

export const RecordingAccessFilter = async (
    req: express.Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        /* The same headers the tenant sign-in check reads. Read directly rather
           than from the request object it fills in, so this does not depend on
           running after it. */
        const tenantDbName = String(req.headers["x-db-name"] || "").trim();
        if (!tenantDbName) return next();

        const defaults = await readCompanyDefaults(tenantDbName);
        const policy = readRecordingAccessPolicy(defaults?.settings);

        /* Nothing switched off. Leave the request completely alone. */
        if (!isRecordingAccessRestricted(policy)) return next();

        const viewer = {
            extension: normalizeExtension(req.headers["x-user-extension"]),
            isAdmin: String(req.headers["x-user-role"] || "").trim() === ADMIN_ROLE,
        };

        const sendJson = res.json.bind(res);

        res.json = function filteredJson(body: any): Response {
            try {
                /* Objects only. A plain string or a buffer cannot be holding a
                   call row, and taking one apart would be wasted work. */
                if (!body || typeof body !== "object") return sendJson(body);

                const text = JSON.stringify(body);
                if (!text || text.indexOf(RECORDING_MARKER) === -1) return sendJson(body);

                /* Turned into a plain object first. The rows are database objects
                   whose values live behind accessors, so changing them in place is
                   unreliable; the answer is going to be turned into text anyway,
                   so this only moves that work a moment earlier. */
                const plain = JSON.parse(text);
                const withheld = scrubRecordings(plain, policy, viewer);

                if (withheld > 0) {
                    console.info(
                        `RecordingAccessFilter: withheld ${withheld} recording(s) on ${req.method} ${req.originalUrl} for ${tenantDbName}.`,
                    );
                }

                return sendJson(plain);
            } catch (error) {
                /* A company rule must never be the reason somebody's call log
                   fails to load. If anything at all goes wrong in here, the
                   original answer is sent exactly as it was built. */
                console.error(
                    "RecordingAccessFilter: could not filter this response, sending it unchanged.",
                    (error as any)?.message || error,
                );
                return sendJson(body);
            }
        } as any;

        return next();
    } catch (error) {
        /* Same promise at the outer level: this filter can fail, and when it does
           the service behaves exactly as it does today. */
        console.error(
            "RecordingAccessFilter: skipped for this request.",
            (error as any)?.message || error,
        );
        return next();
    }
};

export default RecordingAccessFilter;
