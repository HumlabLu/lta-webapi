import { Request, Response, response } from "express";
import { MongooseDocument, Mongoose, Error } from "mongoose";
import { Model, Document, DocumentQuery } from "mongoose";
const converter = require('json-2-csv');

var moment = require('moment-timezone');

var jmespath = require('jmespath');

import { Survey, Assignment, AssignmentResults, Dataset, User, Group } from "../models/survey.model";

import {
    ADMIN_USERNAMES,
    PING_MESSAGE,
    JMESPATH_dataset,
    NOTIFY_PUBLISH_SINCE_MINUTES,
    NOTIFY_EXPIRE_IN_MINUTES,
    EXPIRE_DEFAULT_AFTER_PUBLISH_MINUTES
} from "../constants/surveyApi.constants"

import admin from "./firebaseAdmin.service";
import Rand, { PRNG } from 'rand-seed';

export const getAuthToken = (req: Request, res: Response, callback: (ah: any) => void) => {

    var token = req.header("token");
    // SurveyService.dbgMsg("header: " + token);
    callback(token);
};

export const checkIfAuthenticatedAdmin = (req: Request, res: Response, callback: (uid: string) => void) => {
    getAuthToken(req, res, async (ah: any) => {
        try {
            const userInfo = await admin
                .auth()
                .verifyIdToken(ah);

            var verifiedUserId = userInfo.email.replace("@humlablu.com", "");

            if (!ADMIN_USERNAMES.includes(verifiedUserId)) {
                SurveyService.dbgMsg("Unauthorized: " + verifiedUserId + " is not admin.");
                return res.status(401).send({ error: 'You are not authorized to make this request' });
            }

            return callback(verifiedUserId);

        } catch (e) {
            SurveyService.dbgMsg("Unauthorized: " + e + "\n auth header:\n" + ah);
            return res.status(401).send({ error: 'You are not authorized to make this request' });
        }
    });
};

export const checkIfAuthenticatedUserIdOrAdmin = (userId: String, req: Request, res: Response, callback: (uid: string) => void) => {
    getAuthToken(req, res, async (ah: any) => {
        try {
            const userInfo = await admin
                .auth()
                .verifyIdToken(ah);

            var verifiedUserId = userInfo.email.replace("@humlablu.com", "");

            if (verifiedUserId != userId && !ADMIN_USERNAMES.includes(verifiedUserId)) {
                SurveyService.dbgMsg("Unauthorized: " + verifiedUserId + " imposing as " + userId);
                return res.status(401).send({ error: 'You are not authorized to make this request' });
            }

            return callback(verifiedUserId);
        } catch (e) {
            SurveyService.dbgMsg("Unauthorized: " + e + "\n auth header:\n" + ah);
            return res.status(401).send({ error: 'You are not authorized to make this request' });
        }
    });
};

export const getAuthenticatedUserId = (req: Request, res: Response, callback: (uid: string) => void) => {
    getAuthToken(req, res, async (ah: any) => {
        try {
            const userInfo = await admin
                .auth()
                .verifyIdToken(ah);

            var verifiedUserId = userInfo.email.replace("@humlablu.com", "");

            return callback(verifiedUserId);
        } catch (e) {
            SurveyService.dbgMsg("Unauthorized: " + e + "\n auth header:\n" + ah);
            return res.status(401).send({ error: 'You are not authorized to make this request' });
        }
    });
};

export class SurveyService {

    static dbgReq(req: Request) {
        console.log(new Date().toUTCString() + ", " + SurveyService.name + ": " + req.method + " " + req.originalUrl);
    }

    static dbgMsg(msg: String) {
        console.log(new Date().toUTCString() + ", " + SurveyService.name + ": " + msg);
    }

    static dbgErr(err: Error) {
        console.log(new Date().toUTCString() + ", " + SurveyService.name + ": " + err);
    }

    /* misc */

    public getPingMessage(req: Request, res: Response) {
        SurveyService.dbgReq(req);
        return res.status(200).send(PING_MESSAGE);
    }

    public exampleSurvey(req: Request, res: Response) {
        SurveyService.dbgReq(req);
        return res.status(200).send(require("../constants/exampleSurvey.json"));
    }

    /* user */

    public getAllUsers(req: Request, res: Response) {

        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            User.find({}, (error: Error, user: MongooseDocument) => {
                if (error) {
                    res.send(error);
                } else {
                    res.json(user);
                }
            }).sort('-createdAt');

        });
    }


    private getDeviceRegistrationTokenFromUserId(userId: string, callback: (deviceRegistrationToken: string) => void) {

        User.findOne({ "userId": userId }, (error: Error, user: MongooseDocument) => {
            if (error) {
                console.log(error);
            } else {
                if (user) { callback(user.get("deviceToken")); }
                else { console.log("Cannot get deviceRegistrationToken: User `" + userId + "` not found."); }
            }
        })
    }

    private getTimezoneFromUserId(userId: string, callback: (timezone: String) => void) {

        User.findOne({ "userId": userId }, (error: Error, user: MongooseDocument) => {
            if (error) {
                console.log(error);
            } else {
                if (user) { callback(user.get("timezone")); }
                else { console.log("Cannot get timezone: User `" + userId + "` not found."); }
            }
        })
    }

    public getUserById(req: Request, res: Response) {
        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            SurveyService.dbgReq(req);
            User.findOne({ userId: req.params.id }, (error: Error, user: MongooseDocument) => {
                if (error) {
                    res.send(error);
                } else {
                    res.json(user);
                }
            })

        });
    }

    public updateUser(req: Request, res: Response) {

        SurveyService.dbgReq(req);

        checkIfAuthenticatedUserIdOrAdmin(req.params.id, req, res, (uid: string) => {
            SurveyService.dbgMsg("zup " + uid + "!");

            const condition = { userId: req.params.id };
            let options = { upsert: true, new: true, setDefaultsOnInsert: true };

            User.findOneAndUpdate(
                condition,
                req.body,
                options,
                (error: Error, user: any) => {
                    if (error) {
                        res.send(error);
                    } else {
                        if (user) { res.send('Updated successfully'); }
                        else { res.status(404).send("User not found."); }
                    }
                }
            )
        });
    }


    /* Group */

    public getAllGroups(req: Request, res: Response) {

        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            Group.find({}, (error: Error, group: MongooseDocument) => {
                if (error) {
                    res.send(error);
                } else {
                    res.json(group);
                }
            }).sort('-createdAt');
        });
    }

    public createGroup(req: Request, res: Response) {

        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            const condition = { groupId: req.params.id };

            Group.findOne(
                condition,
                req.body,
                (error: Error, group: any) => {
                    if (error) { res.send(error); }
                    else {
                        if (group) { res.status(409).send("Group " + req.params.id + " already exists."); }
                        else {

                            let options = { upsert: true, new: true, setDefaultsOnInsert: true };

                            Group.findOneAndUpdate(
                                condition,
                                req.body,
                                options,
                                (error: Error, group: any) => {
                                    if (error) { res.send(error); }

                                    res.status(201).send("Group " + req.params.id + " created.");
                                }
                            )
                        }
                    }
                }
            )
        });
    }

    public getGroupById(req: Request, res: Response) {
        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            SurveyService.dbgReq(req);
            Group.findOne({ groupId: req.params.id }, (error: Error, group: MongooseDocument) => {
                if (error) {
                    res.send(error);
                } else {
                    res.json(group);
                }
            })
        });
    }

    public getGroupsOfUser(req: Request, res: Response) {
        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");
            SurveyService.dbgReq(req);

            Group.find(
                {
                    userIds: { $in: [req.params.uid] }
                },
                (error: Error, group: MongooseDocument) => {
                    if (error) {
                        res.send(error);
                    } else {
                        res.json(group);
                    }
                })
        });
    }

    public updateGroup(req: Request, res: Response) {

        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            const condition = { groupId: req.params.gid };
            let options = { upsert: false, new: false };

            SurveyService.dbgMsg("checking for " + req.params.gid);
            Group.findOneAndUpdate(
                condition,
                req.body,
                options,
                (error: Error, group: any) => {
                    if (error) {
                        res.send(error);
                    } else {
                        if (group) { res.send('Updated successfully'); }
                        else { res.status(404).send("Group not found."); }
                    }
                }
            )
        });
    }

    public deleteGroup(req: Request, res: Response) {

        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            const condition = { groupId: req.params.gid };

            Group.findOneAndDelete(
                condition,
                req.body,
                (error: Error, group: any) => {
                    if (error) {
                        res.send(error);
                    } else {
                        if (group) { res.status(204).send('Deleted successfully'); }
                        else { res.status(404).send("Group not found."); }
                    }
                }
            )
        });
    }


    /* survey */

    public getAllSurveys(req: Request, res: Response) {
        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            Survey.find({}, (error: Error, surveys: MongooseDocument) => {
                if (error) {
                    res.send(error)
                } else {
                    res.json(surveys)
                }
            }).sort('-createdAt');
        });
    }

    public getSurveyById(req: Request, res: Response) {
        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            Survey.findOne({ _id: req.params.id }, (error: Error, survey: MongooseDocument) => {
                if (error) {
                    res.send(error);
                } else {
                    res.json(survey);
                }
            }).sort('-createdAt');
        });
    }

    public findSurveyByName(req: Request, res: Response) {
        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            Survey.find({ "name": { "$regex": req.query.t, "$options": "i" } }, (error: Error, surveys: MongooseDocument) => {
                if (error) {
                    res.send(error);
                } else {
                    res.json(surveys);
                }
            }).sort('-createdAt');

        });
    }

    public findUserByUserId(req: Request, res: Response) {
        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            User.find({ "userId": { "$regex": req.query.t, "$options": "i" } }, (error: Error, users: MongooseDocument) => {
                if (error) {
                    res.send(error);
                } else {
                    res.json(users);
                }
            }).sort('-createdAt');

        });
    }

    public findAssignmentBySurveyNameUserIdGroupId(req: Request, res: Response) {
        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            Assignment.find(
                {
                    $or: [
                        { "name": { "$regex": req.query.t, "$options": "i" } },
                        { "userId": { "$regex": req.query.t, "$options": "i" } },
                        { "groupId": { "$regex": req.query.t, "$options": "i" } }]
                }, (error: Error, assignments: MongooseDocument) => {
                    if (error) {
                        res.send(error);
                    } else {
                        res.json(assignments);
                    }
                }).sort('-publishedAt');
        });
    }

    public addNewSurvey(req: Request, res: Response) {
        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            const newSurvey = new Survey(req.body);
            newSurvey.save((error: Error, survey: MongooseDocument) => {
                if (error) {
                    res.send(error);
                } else {
                    res.json(survey);
                }
            });
        });
    }

    public deleteSurvey(req: Request, res: Response) {
        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            const surveyID = req.params.id;
            Survey.findByIdAndDelete(surveyID, (error: Error, deleted: any) => {
                if (error) {
                    res.send(error);
                } else {
                    if (deleted) { res.send('Deleted successfully'); }
                    else { res.status(404).send("Survey not found."); }
                }

            });
            // alternative:
            // findOneAndDelete({_id: surveyId})
        });
    }

    public updateSurvey(req: Request, res: Response) {
        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            const surveyId = req.params.id;
            Survey.findByIdAndUpdate(
                surveyId,
                req.body,
                (error: Error, survey: any) => {
                    if (error) {
                        res.send(error);
                    } else {
                        if (survey) { res.send('Updated successfully'); }
                        else { res.status(404).send("Survey not found."); }
                    }
                }
            )
        });
    }


    /* dataset */

    public addNewDataset(req: Request, res: Response) {
        SurveyService.dbgReq(req);

        // TODO: should auth the uid of the assignment, not the URL proclaimed uid, to be able to get assignment from aid only, not needing user

        checkIfAuthenticatedUserIdOrAdmin(req.params.uid, req, res, (uid: string) => {
            SurveyService.dbgMsg("zup " + uid + "!");

            const condition = { "_id": req.params.aid };
            const updateClause = { $set: { dataset: req.body } };

            // TODO: rewrite for AR, don't post directly on group assignment!
            // Assignment.findOneAndUpdate(condition, updateClause, (error: Error) => {
            //     if (error) { res.send(error); }
            //     else {
            //         Assignment.findOne(condition, (error: Error, assignment: MongooseDocument) => {
            //             if (error) {
            //                 res.send(error);
            //             } else {
            //                 if (assignment) {
            //                     res.json(assignment);
            //                 } else {
            //                     res.status(404).send("Assignment not found.");
            //                 }
            //             }
            //         });
            //     }
            // });

            // TODO: delete above when below rewrite works

            Assignment.findOne(condition, (error: Error, assignment: MongooseDocument) => {
                if (error) { res.send(error); } else {
                    if (assignment) {
                        const groupId = assignment.get("groupId");
                        if (groupId) {

                            AssignmentResults.findOneAndUpdate(
                                { assignment: req.params.aid, userId: uid}, updateClause,
                                (error: Error) => {
                                    if (error) { console.log(error); }
                                    else {
                                        res.status(201).send("the Dataset has been stored.")
                                    }
                                })



                        } else {
                            Assignment.findOneAndUpdate(condition, updateClause, (error: Error) => {
                                if (error) { res.send(error); }
                                else {
                                    Assignment.findOne(condition, (error: Error, assignment: MongooseDocument) => {
                                        if (error) {
                                            res.send(error);
                                        } else {
                                            if (assignment) {
                                                res.json(assignment);
                                            } else {
                                                res.status(404).send("Assignment not found.");
                                            }
                                        }
                                    });
                                }
                            });
                        }
                    } else {
                        res.status(404).send("Assignment not found.");
                    }
                }
            });
        });
    }


    /* assignment */

    private saveNewAssignment(surveyId: string, userId: string, publishAt: Date, expireAt: Date, callback: (code: number, body: any) => void) {

        var newAssignment = new Assignment();

        if (userId) {
            newAssignment.set("userId", userId);
        } else {
            callback(409, "no user. ")
        }

        Survey.findOne({ _id: surveyId }, (error: Error, survey: MongooseDocument) => {
            if (error) {
                console.log(error);
                callback(500, error);
            } else {
                if (survey) {
                    SurveyService.dbgMsg("Saving new assignment publishAt: " + publishAt)
                    newAssignment
                        .set("survey", survey)
                        .set("publishAt", publishAt)
                        .set("expireAt", expireAt)
                        .save();
                    callback(201, newAssignment);
                }
                else {
                    callback(404, "Survey not found. ")
                }
            }
        });
    }

    private saveNewGroupAssignment(surveyId: string, groupId: string, publishFrom: Date, publishTo: Date, callback: (code: number, body: any) => void) {

        var newAssignment = new Assignment();

        if (groupId) {
            newAssignment.set("groupId", groupId);
        } else {
            callback(409, "no group. ")
        }

        Survey.findOne({ _id: surveyId }, (error: Error, survey: MongooseDocument) => {
            if (error) {
                console.log(error);
                callback(500, error);
            } else {
                if (survey) {
                    newAssignment
                        .set("survey", survey)
                        .set("publishFrom", publishFrom)
                        .set("publishTo", publishTo)
                        .save();
                    callback(201, newAssignment);
                }
                else {
                    callback(404, "Survey not found. ")
                }
            }
        });
    }

    public scheduleSurveyForUserOnce(reqJustForAuth: Request, sid: string, uid: string, publishAtUnix: string, res: Response) {
        SurveyService.dbgReq(reqJustForAuth);

        checkIfAuthenticatedAdmin(reqJustForAuth, res, (uidJustForAuth: string) => {
            SurveyService.dbgMsg("greetings admin " + uidJustForAuth + "!");

            SurveyService.dbgMsg("scheduleSurveyForUserOnce: sid: " + sid + ", uid: " + uid + ", publishAt: " + publishAtUnix);

            console.log("publishAtUnix : " + publishAtUnix);
            var publishAtMoment = moment.unix(publishAtUnix);
            var publishAtDate = publishAtMoment.toDate();
            var expireAtDate = this.getExpireAtMoment(publishAtMoment).toDate()

            SurveyService.dbgMsg("publishAtUnix: string : " + publishAtUnix);
            SurveyService.dbgMsg("publishAtMoment:          " + publishAtMoment);
            SurveyService.dbgMsg("publishAtMoment UTC     : " + publishAtMoment.utc());
            SurveyService.dbgMsg("publishAtMoment:    date  " + publishAtMoment.toDate());
            SurveyService.dbgMsg("publishAtMoment UTC date: " + publishAtMoment.utc().toDate());

            this.saveNewAssignment(sid, uid, publishAtDate, expireAtDate.format, (code, body) => { res.status(code).send(body); });
        });
    }

    private getExpireAtMoment(publishAtMoment: any) {
        return publishAtMoment.add(EXPIRE_DEFAULT_AFTER_PUBLISH_MINUTES, "m")
    }

    private randomSkew(plusMinusRandomMinutes: number): number {
        if (plusMinusRandomMinutes == 0) return 0;

        return Math.floor(Math.random() * (plusMinusRandomMinutes * 2 + 1) - plusMinusRandomMinutes);
    }

    static pseudorandomSkew(assignmentId: String, userId: String, plusMinusRandomMinutes: number): number {
        if (plusMinusRandomMinutes == 0) return 0;

        // console.log("pseudorandomizing on " + assignmentId + " " + userId)
        const rand = new Rand(assignmentId + " " + userId);

        return Math.floor(rand.next() * plusMinusRandomMinutes);
    }

    public scheduleSurveyForUser(reqJustForAuth: Request, sid: string, uid: string, startYMD: string, endYMD: string, hours: Array<string>, plusMinusRandomMinutes: number, res: Response) {
        SurveyService.dbgReq(reqJustForAuth);
        checkIfAuthenticatedAdmin(reqJustForAuth, res, (uidJustForAuth: string) => {
            SurveyService.dbgMsg("greetings admin " + uidJustForAuth + "!");

            SurveyService.dbgMsg("scheduleSurveyForUser: sid: " + sid + ", uid: " + uid + ", dates: " + startYMD + " - " + endYMD + " at " + hours.toString() + " plus minus " + plusMinusRandomMinutes + ".");

            if (hours.length == 0) {
                const eMsg = "Empty hour array";
                SurveyService.dbgMsg(eMsg);
                res.status(400).send(eMsg);
            }

            var daysInSchedule: number = 0;
            const userTz = "Europe/Stockholm";
            for (var m = moment.tz(startYMD, userTz); m.diff(moment.tz(endYMD, userTz), 'days') <= 0; m.add(1, 'days')) {
                daysInSchedule++;
                SurveyService.dbgMsg("Scheduling for " + userTz + " date " + m.format('YYYY-MM-DD'));
                for (var i = 0; i < hours.length; i = i + 1) {
                    var h = hours[i];
                    var publishAtUserTzMoment = moment.tz(m.format('YYYY-MM-DD') + " " + h, userTz).add(this.randomSkew(plusMinusRandomMinutes), "minutes");

                    if (h.trim() == "" || !publishAtUserTzMoment.isValid()) {
                        console.log("Invalid hour " + i + ": `" + hours[i] + "`");
                        continue;
                    }

                    var publishAtDate = publishAtUserTzMoment.utc().toDate();
                    var expireAtDate = publishAtUserTzMoment.add(EXPIRE_DEFAULT_AFTER_PUBLISH_MINUTES, "m").utc().toDate()

                    SurveyService.dbgMsg(`Scheduling ${sid} for ${uid} at ${publishAtUserTzMoment} ${publishAtDate}`);

                    this.saveNewAssignment(sid, uid, publishAtDate, expireAtDate, (code, body) => {
                        if (code != 201) {
                            SurveyService.dbgMsg(`code ${code}: ${body}`);
                        }
                    });
                };
            }

            var statusMessage = "Scheduled " + hours.length + " assignments per day over " + daysInSchedule + " days.";
            SurveyService.dbgMsg(statusMessage);

            res.status(201).send(statusMessage);
        });
    }

    public createGroupAssignmentSeries(reqJustForAuth: Request, sid: string, gid: string, startYMD: string, endYMD: string, hours: Array<string>, plusMinusRandomMinutes: number, res: Response) {
        SurveyService.dbgReq(reqJustForAuth);
        checkIfAuthenticatedAdmin(reqJustForAuth, res, (uidJustForAuth: string) => {
            SurveyService.dbgMsg("greetings admin " + uidJustForAuth + "!");

            SurveyService.dbgMsg("createGroupAssignmentSeries: sid: " + sid + ", gid: " + gid + ", dates: " + startYMD + " - " + endYMD + " at " + hours.toString() + " plus minus " + plusMinusRandomMinutes + ".");


            if (hours.length == 0) {
                const eMsg = "Empty hour array";
                SurveyService.dbgMsg(eMsg);
                res.status(400).send(eMsg);
            }

            var daysInSchedule: number = 0;
            for (var m = moment(startYMD); m.diff(moment(endYMD), 'days') <= 0; m.add(1, 'days')) {
                daysInSchedule++;
                SurveyService.dbgMsg("Scheduling for date " + m.format('YYYY-MM-DD'));
                for (var i = 0; i < hours.length; i = i + 1) {
                    var h = hours[i];
                    var publishAtMoment = moment.tz(m.format('YYYY-MM-DD') + " " + h, "Europe/Stockholm"); //TODO: now assuming admin is in sthlm
                    SurveyService.dbgMsg("publishAtMoment is " + publishAtMoment);


                    // TODO: On server


                    if (h.trim() == "" || !publishAtMoment.isValid()) {
                        console.log("Invalid hour " + i + ": `" + hours[i] + "`");
                        continue;
                    }

                    var publishFromDate = moment(publishAtMoment).add(-plusMinusRandomMinutes, "m").utc().toDate();
                    var publishToDate = moment(publishAtMoment).add(plusMinusRandomMinutes, "m").utc().toDate();

                    SurveyService.dbgMsg(`Scheduling ${sid} for ${gid} at ${publishAtMoment} +/- ${plusMinusRandomMinutes} minutes`);

                    this.saveNewGroupAssignment(sid, gid, publishFromDate, publishToDate, (code, body) => {
                        if (code != 201) {
                            SurveyService.dbgMsg(`code ${code}: ${body}`);
                        }
                    });
                };
            }

            var statusMessage = "Scheduled " + hours.length + " group assignments per day over " + daysInSchedule + " days.";
            SurveyService.dbgMsg(statusMessage);

            res.status(201).send(statusMessage);
        });
    }

    public deleteAssignment(req: Request, res: Response) {
        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            const assignmentId = req.params.aid;
            Assignment.findByIdAndDelete(assignmentId, (error: Error, deleted: any) => {
                if (error) {
                    res.send(error);
                } else {
                    if (deleted) { res.send('Deleted successfully'); }
                    else { res.status(404).send("Assignment not found."); }
                }
            });
        });
    }

    public getAssignments(req: Request, res: Response, sortBy: string, from: any, to: any) {
        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            let query = this.getQuerySortAndFilter(moment(from, "X").valueOf(), moment(to, "X").valueOf(), sortBy, Assignment);

            query.exec(function (error: Error, assignments: MongooseDocument) {
                if (error) {
                    res.send(error);
                } else {
                    res.json(assignments);
                }
            })
        });
    }

    public getAllAssignmentResults(req: Request, res: Response) {
        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            AssignmentResults.find((error: Error, ars: any) => {
                if (error) {
                    res.send(error);
                } else {
                    res.json(ars);
                }
            })
        });
    }
    public getAssignmentResult(req: Request, res: Response) {
        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            const condition = { _id: req.params.arid };

            AssignmentResults.findOne(condition, (error: Error, ar: any) => {
                if (error) {
                    res.send(error);
                } else { // TODO all if(error)'s need elses
                    if (ar) { res.json(ar) }
                    else { res.status(404).send("AssignmentResult not found.") }
                }
            })
        });
    }

    public deleteAssignmentResult(req: Request, res: Response) {

        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            const condition = { _id: req.params.arid };

            AssignmentResults.findOneAndDelete(
                condition,
                req.body,
                (error: Error, ar: any) => {
                    if (error) {
                        res.send(error);
                    } else {
                        if (ar) { res.status(204).send('Deleted successfully') }
                        else { res.status(404).send("AssignmentResult not found.") }
                    }
                }
            )
        });
    }

    public getAssignmentResultOfAssignment(req: Request, res: Response) {

        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");
            const condition = { assignment: req.params.aid };
            AssignmentResults.find(
                condition,
                (error: Error, ars: any) => {
                    if (error) {
                        res.send(error);
                    } else {
                        if (ars) { res.json(ars); }
                        else { res.status(404).send("AssignmentResult for assignment not found.") }
                    }
                }
            )
        });
    }


    private getQuerySortAndFilter(fromUnixms: number, toUnixms: number, sortBy: string, model: Model<Document>): DocumentQuery<Document[], Document, {}> {

        let query = model.find();

        if (!sortBy || sortBy.trim().length == 0) {
            sortBy = 'createdAt'
        }

        let fromMoment = moment(fromUnixms, "x");
        let toMoment = moment(toUnixms, "x");

        if (fromMoment.isValid() && toMoment.isValid()) {
            query.or([
                {
                    publishAt: {
                        $gte: fromUnixms,
                        $lte: toUnixms
                    }
                }, {
                    publishFrom: { $lte: toUnixms },
                    publishTo: { $gte: fromUnixms },
                }
            ]);
            SurveyService.dbgMsg("filtering on publishAt between " + fromMoment.toString() + " and " + toMoment.toString());
        }

        query.sort(sortBy);

        return query;
    }

    public getAssignment(req: Request, res: Response) {
        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            Assignment.findOne({ _id: req.params.aid }, (error: Error, assignment: MongooseDocument) => {
                if (error) {
                    res.send(error);
                } else {
                    res.json(assignment);
                }
            })
        });
    }

    public postAssignmentOpened(req: Request, res: Response) {
        SurveyService.dbgReq(req);
        getAuthenticatedUserId(req, res, (uid: string) => {
            SurveyService.dbgMsg("oh hi " + uid + "!");

            const condition = { "_id": req.params.aid, "user:": uid };

            Assignment.findOne(
                condition,
                (error: Error, assignment: any) => {
                    if (error) { console.log(error); }
                    else {
                        var updateClause;

                        if (assignment) {
                            if (assignment.firstOpenedAt == undefined) {
                                SurveyService.dbgMsg("First open of " + assignment._id)
                                updateClause = {
                                    $set: {
                                        firstOpenedAt: new Date(),
                                        lastOpenedAt: new Date()
                                    }
                                }
                            } else {
                                SurveyService.dbgMsg("New open of " + assignment._id)
                                updateClause = {
                                    $set: {
                                        lastOpenedAt: new Date()
                                    }
                                }
                            }

                            Assignment.findOneAndUpdate(
                                condition,
                                updateClause,
                                (error: Error, assignment: any) => {
                                    if (error) { console.log(error); }
                                });

                            res.status(201).send("the Assignment open has been recorded")

                        } else {
                            AssignmentResults.findOne(
                                { assignment: req.params.aid, userId: uid },
                                (error: Error, ar: any) => {
                                    if (error) { console.log(error); }
                                    else {
                                        var updateClause;

                                        if (ar) {
                                            if (ar.firstOpenedAt == undefined) {
                                                SurveyService.dbgMsg("First open of " + ar._id)
                                                updateClause = {
                                                    $set: {
                                                        firstOpenedAt: new Date(),
                                                        lastOpenedAt: new Date()
                                                    }
                                                }
                                            } else {
                                                SurveyService.dbgMsg("New open of " + ar._id)
                                                updateClause = {
                                                    $set: {
                                                        lastOpenedAt: new Date()
                                                    }
                                                }
                                            }

                                            AssignmentResults.findOneAndUpdate(
                                                { assignment: req.params.aid, userId: uid },
                                                updateClause,
                                                (error: Error) => {
                                                    if (error) { console.log(error); }
                                                })

                                            res.status(201).send("the Assignment Result open has been recorded")
                                        } else {
                                            SurveyService.dbgMsg("ar " + ar + " not found");
                                            res.status(404).send("assignment result for assignment " + req.params.aid + " and userId " + uid + " not found")
                                        }
                                    }
                                }
                            )       
                        }
                    }
                });
        });
    }

    public getAssignmentsOfGroup(req: Request, res: Response) {

        SurveyService.dbgReq(req);
        const userId = req.params.uid as String;
        checkIfAuthenticatedUserIdOrAdmin(userId, req, res, (uid: string) => {
            SurveyService.dbgMsg("zup " + uid + "!");

            var condition = { "groupId": req.params.gid }

            Assignment.find(condition, (error: Error, assignments: any) => {
                if (error) {
                    res.send(error);
                } else {
                    assignments.forEach((a: any) => {
                        console.log(a.publishFrom)
                    });
                    res.json(assignments.sort((a: any, b: any) => a.publishFrom < b.publishFrom ? -1 : a.publishFrom > b.publishFrom ? 1 : 0));
                }
            }).lean().sort('publishFrom');

        })
    }

    public getAssignmentsOfUser(req: Request, res: Response, includeNotYetPublished: boolean) {

        SurveyService.dbgReq(req);
        const userId = req.params.uid as String;
        checkIfAuthenticatedUserIdOrAdmin(userId, req, res, (uid: string) => {
            SurveyService.dbgMsg("zup " + uid + "!");

            Group.distinct("groupId",
                {
                    userIds: { $in: [req.params.uid] }
                },
                (error: Error, groups: String[]) => {
                    if (error) {
                        SurveyService.dbgErr(error);
                        res.send(error);
                    } else {

                        SurveyService.dbgMsg("found groups for user " + userId + ": " + groups)

                        var condition: any = {};

                        if (includeNotYetPublished) {
                            condition = {
                                $or: [
                                    { "userId": userId },
                                    { "groupId": { $in: groups }, }
                                ]
                            }
                        } else {
                            condition = {
                                $or: [
                                    { "userId": userId, "publishAt": { $lte: moment().utc() } },
                                    { "groupId": { $in: groups }, "publishFrom": { $lte: moment().utc() } }
                                ]
                            }
                        }

                        Assignment.find(condition, (error: Error, assignments: any) => {
                            if (error) { res.send(error); }
                            else {
                                addPublishAtToAssignmentsBasedOnUser(assignments, userId);

                                // remove assignments not yet publishAt
                                if (!includeNotYetPublished) {
                                    assignments = assignments.filter((a: any) => moment(a.publishAt) < moment())
                                }

                                // Get an array of assignment ids
                                var arrayOfAssIds = assignments.map(function (a: any) {
                                    return a._id;
                                });

                                // Get all assignmentresults for those assignment ids
                                AssignmentResults.find().where('assignment').in(arrayOfAssIds).exec((err, assignmentResults: any) => {

                                    assignmentResults.forEach((ar: any) => {
                                        assignments.forEach((a: any ) => {
                                            // console.log(a._id + " : " + ar.get('assignment'))
                                            if (String(a._id) == String(ar.assignment) && req.params.uid == ar.userId) {
                                                a.publishNotifiedAt = ar.publishNotifiedAt
                                                a.expireNotifiedAt = ar.expireNotifiedAt
                                                a.firstOpenedAt = ar.firstOpenedAt
                                                a.lastOpenedAt = ar.lastOpenedAt
                                                a.dataset = ar.dataset
                                                a.userId = ar.userId
                                            }
                                        });
                                    });

                                    res.json(assignments.sort((a: any, b: any) => a.publishAt < b.publishAt ? -1 : a.publishAt > b.publishAt ? 1 : 0))
                                });
                            }
                        }).lean().sort('-publishedAt').then(
                            
                        );
                    }
                }
            );
        })
    }

    public deleteAssignmentsOfUser(req: Request, res: Response) {
        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            const userId = req.params.uid;
            const condition = { "userId": userId }
            Assignment.deleteMany(condition, (error: Error) => {
                if (error) {
                    res.send(error);
                } else {
                    res.send('Deleted user assignments of user ' + userId)
                }
            });
        });
    }

    public getAssignmentsOfSurvey(req: Request, res: Response) {
        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            const surveyId = req.params.sid as String;

            Assignment.find({ "survey._id": surveyId }, (error: Error, assignments: any) => {
                if (error) {
                    res.send(error);
                } else {
                    res.json(assignments);
                }
            }).sort({publishAt: 1, publishFrom: 1});
        });
    }

    private static pad(str: any, max: Number): string {
        str = str.toString();
        return str.length < max ? SurveyService.pad("0" + str, max) : str;
    }

    // private static getDatasetsOfAssignmentResults(assignmentresults: any) {

    //         // dress with results
    //                                         // Get an array of assignment ids
    //                                         var arrayOfAssIds = assignmentresults.map(function (a: any) {
    //                                             return a._id;
    //                                         });
            
    //                                         // Get all assignmentresults for those assignment ids
    //                                         AssignmentResults.find().where('assignment').in(arrayOfAssIds).exec((err, assignmentResults: any) => {
            
    //                                             assignmentResults.forEach((ar: any) => {
    //                                                 assignments.forEach((a: any ) => {
    //                                                     if (String(a._id) == String(ar.assignment) && req.params.uid == ar.userId) {
    //                                                         a.publishNotifiedAt = ar.publishNotifiedAt
    //                                                         a.expireNotifiedAt = ar.expireNotifiedAt
    //                                                         a.firstOpenedAt = ar.firstOpenedAt
    //                                                         a.lastOpenedAt = ar.lastOpenedAt
    //                                                         a.dataset = ar.dataset
    //                                                         a.userId = ar.userId
    //                                                     }
    //                                                 });
    //                                             });
    //                                         }            
    // }

    private static getDatasetsOfAssignments(assignments: any) {

        let flattened = new Array();

        assignments.forEach((a: any) => {

            var dynJmesPath = JMESPATH_dataset;

            if (a.dataset) {
                a.dataset.answers.forEach((answer: any) => {
                    var indexStr = SurveyService.pad(answer.index, 2); //todo handle more than 99 questions
                    if (answer.type == "single" || answer.type == "duration" || answer.type == "likert" || answer.type == "blanks") {
                        dynJmesPath += `, "q${indexStr}": '${answer.intValue}'`;
                    } else if (answer.type == "open") {
                        dynJmesPath += `, "q${indexStr}": '${answer.stringValue}'`;
                    } else if (answer.type == "multi") {
                        let multiValueString = answer.multiValue.toString();
                        console.log("multiValueString = " + multiValueString)
                        dynJmesPath += `, "q${indexStr}": '${multiValueString}'`;
                        (answer.multiValue + ``).split(',').forEach((v: string) => {
                            let vt = v.trim();
                            dynJmesPath += `, "q${indexStr}.${vt}": '1'`;
                        });
                    } else {
                        dynJmesPath += `, "q${indexStr}": ''`;
                    }
                });

                dynJmesPath += "}"
                console.log("here the dynJmesPath: " + dynJmesPath);

                let flatA = jmespath.search(a, dynJmesPath);
                console.log("here the resulting json: " + JSON.stringify(flatA));

                flattened.push(flatA);
            } else {
                console.log("assignment " + a._id + " does not have a dataset.")
            }
        });

        return flattened;
    }

    public getAllDatasetsOfSurvey(req: Request, res: Response) {
        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            const surveyId = req.params.sid as String;

            Assignment.find({ "survey._id": surveyId }, (error: Error, assignments: any) => {
                if (error) {
                    res.send(error);
                } else {
                    res.json(SurveyService.getDatasetsOfAssignments(assignments));
                }
            }).sort('-publishedAt');
        });
    }

    public getAllDatasetsOfSurveyCSV(req: Request, res: Response) {
        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");
            const surveyId = req.params.sid as String;

            Assignment.find({ "survey._id": surveyId }, (error: Error, assignments: any) => {

                if (error) {
                    res.send(error);
                } else {
                    SurveyService.dbgMsg("found " + assignments.length + " assignments of survey " + surveyId);
                    converter.json2csv(SurveyService.getDatasetsOfAssignments(assignments), (error: Error, csv: string) => {
                        if (error) {
                            res.send(error);
                        } else {
                            console.log("here the resulting csv: " + csv);

                            res.send(csv);
                        }
                    }, { "unwindArrays": true }
                    );
            }
            }).sort('-publishedAt');
        });
    }

    public getAllDatasetsOfSurvey_ar(req: Request, res: Response, format: String) {
        SurveyService.dbgReq(req);
        checkIfAuthenticatedAdmin(req, res, (uid: string) => {
            SurveyService.dbgMsg("greetings admin " + uid + "!");

            const surveyId = req.params.sid as String;

            Assignment.find({ "survey._id": surveyId }, (error: Error, assignments: any) => {
                if (error) { res.send(error); }
                else {
                    var arrayOfAssIds = assignments.map(function (a: any) { return a._id; })

                    AssignmentResults.find().where('assignment').in(arrayOfAssIds).exec((err, assignmentResults: any) => {
                        if (error) { res.send(error); } 
                        else {
                            const assignmentsBlob = SurveyService.getDatasetsOfAssignments(assignmentResults);
                            if (format === "csv") {
                                converter.json2csv(assignmentsBlob, (error: Error, csv: string) => {
                                    if (error) { res.send(error); } 
                                    else {
                                        console.log("here the resulting csv: " + csv);
            
                                        res.send(csv);
                                    }
                                }, { "unwindArrays": true }
                                );
                            } else {
                                res.json(assignmentsBlob);
                            }
                        }
                    })
                }
            })
        })
    }

    public FindRegistrationTokensForNotification(
        messageCallback:
            (
                deviceRegistrationToken: string,
                title: String,
                body: String
            ) => void
    ) {
        var from = moment().utc().add(-NOTIFY_PUBLISH_SINCE_MINUTES, "m");
        var to = moment().utc();

        AssignmentResults.find({
            publishAt: {
                $gte: from,
                $lte: to
            },
            publishNotifiedAt: { $exists: false }
        }, (error: Error, assignmentResults: any) => {
            if (error) {
                console.log(error);
            } else {
                if (assignmentResults.length == 0) {
                    SurveyService.dbgMsg("None AssignmentResults to publish found. ");
                }

                assignmentResults.forEach((ar: any) => {

                    SurveyService.dbgMsg("Found ar:")
                    
                    var assignmentId: string = ar.assignment._id;
                    var title: string = ar.assignment.survey.publishNotificationTitle;
                    var body: string = ar.assignment.survey.publishNotificationBody;

                    this.getDeviceRegistrationTokenFromUserId(ar.userId, (registrationToken) => {
                        SurveyService.dbgMsg(`Found ${assignmentId} for ${ar.userId} with devregtoken ${registrationToken}`);
                        messageCallback(registrationToken, title, body);
                        this.setAssignmentResult(ar._id, { $set: { publishNotifiedAt: new Date() } }); // TO DO can this be set directly on AR without a new query
                    });
                });
            }

        }).populate('assignment')

        SurveyService.dbgMsg(`Checking for publishAt within ${from} and ${to} but not yet notified. `);

        Assignment.find({
            publishAt: {
                $gte: from,
                $lte: to
            },
            publishNotifiedAt: { $exists: false }
        }, (error: Error, assignments: any) => {
            if (error) {
                console.log(error);
            } else {

                if (assignments.length == 0) {
                    SurveyService.dbgMsg("None Published found. ");
                }

                assignments.forEach((a: any) => {

                    var assignmentId: string = a._id;
                    var title: string = a.survey.publishNotificationTitle;
                    var body: string = a.survey.publishNotificationBody;

                    SurveyService.dbgMsg("publishNotificationTitle: " + title);

                    this.getDeviceRegistrationTokenFromUserId(a.userId, (registrationToken) => {
                        SurveyService.dbgMsg(`Found Published ${registrationToken} : ${assignmentId}`);
                        SurveyService.dbgMsg("publishNotificationTitle: " + title);
                        messageCallback(registrationToken, title, body);
                        this.setAssignment(assignmentId, { $set: { publishNotifiedAt: new Date() } });
                    });
                });
            }

        }).sort('-createdAt');

        var from = moment().utc();
        var to = moment().utc().add(NOTIFY_EXPIRE_IN_MINUTES, "m");;

        SurveyService.dbgMsg(`Checking for Expiring within ${from} and ${to} but not yet notified. `);

        Assignment.find({
            expireAt: {
                $gte: from,
                $lte: to
            },
            expireNotifiedAt: { $exists: false },
            dataset: { $exists: false }
        }, (error: Error, assignments: any) => {
            if (error) {
                console.log(error);
            } else {

                if (assignments.length == 0) {
                    SurveyService.dbgMsg("None expiring found. ");
                }

                assignments.forEach((a: any) => {

                    var assignmentId: string = a._id;
                    var title: string = a.survey.expireNotificationTitle;
                    var body: string = a.survey.expireNotificationBody;

                    this.getDeviceRegistrationTokenFromUserId(a.userId, (registrationToken) => {
                        SurveyService.dbgMsg(`Found expiring ${registrationToken} : ${assignmentId}`);
                        messageCallback(registrationToken, title, body);
                        this.setAssignment(assignmentId, { $set: { expireNotifiedAt: new Date() } });
                    });
                });
            }
        }).sort('-createdAt');

        AssignmentResults.find({
            expireAt: {
                $gte: from,
                $lte: to
            },
            expireNotifiedAt: { $exists: false },
            dataset: { $exists: false }
        }, (error: Error, assignmentResults: any) => {
            if (error) {
                console.log(error);
            } else {
                if (assignmentResults.length == 0) {
                    SurveyService.dbgMsg("None AssignmentResults to publish found. ");
                }

                assignmentResults.forEach((ar: any) => {

                    SurveyService.dbgMsg("Found ar:")
                    
                    var assignmentId: string = ar.assignment._id;
                    var title: string = ar.assignment.survey.expireNotificationTitle;
                    var body: string = ar.assignment.survey.expireNotificationBody;

                    this.getDeviceRegistrationTokenFromUserId(ar.userId, (registrationToken) => {
                        SurveyService.dbgMsg(`Found ${assignmentId} for ${ar.userId} with devregtoken ${registrationToken}`);
                        SurveyService.dbgMsg("expireNotificationTitle: " + title);
                        messageCallback(registrationToken, title, body);
                        this.setAssignmentResult(ar._id, { $set: { expireNotifiedAt: new Date() } }); // TO DO can this be set directly on AR without a new query
                    });
                });
            }

        }).populate('assignment')
    }

    public CreateImpendingResultObjects(
    ) {
        var from = moment().add(-1, "d").add(-1, "h").utc();
        var to = moment().add(1, "d").add(1, "h").utc();

        SurveyService.dbgMsg(`Checking for publishFrom – publishTo overlapping ${from} – ${to} but not yet notified. `);

        Assignment.find({
            publishFrom: {
                $lte: to
            },
            publishTo: {
                $gte: from
            },
        }, (error: Error, assignments: any) => {
            if (error) {
                console.log(error);
            } else {

                if (!assignments.length) {
                    SurveyService.dbgMsg("None publishFrom – publishTo found. ");
                }

                assignments.forEach((a: any) => {

                    var assignmentId: string = a._id

                    Group.findOne({
                        groupId: a.groupId
                    }, (error: Error, g: any) => {

                        if (g) {
                            g.userIds.forEach((userId: any) => {

                                User.findOne({ "userId": userId }, (error: Error, user: MongooseDocument) => {

                                    if (error) {
                                        console.log(error);
                                    } else {
                                        if (user) {
                                            var publishAtForThisUser = getPublishAtForAssignmentBasedOnUser(a.publishFrom, a.publishTo, a._id, userId);

                                            AssignmentResults.findOne(
                                                { "assignment": assignmentId, "userId": userId },
                                                (error: Error, ar: MongooseDocument) => {
                                                    if (error) { console.log(error); }
                                                    else {
                                                        if (!ar) {
                                                            this.saveNewAssignmentResult(assignmentId, userId, publishAtForThisUser);
                                                        } else {
                                                            // SurveyService.dbgMsg(`Assignment ${a._id} for group ${a.groupId} has a result object for ${userId}`);
                                                            // SurveyService.dbgMsg(JSON.stringify(ar))
                                                        }
                                                    }
                                                });
                                        }
                                    }
                                });
                            });
                        }
                    });
                });
            }

        }).sort('-createdAt');
    }

    setAssignment(assignmentId: string, body: any) {
        SurveyService.dbgMsg(`Setting Assignment ${assignmentId}: ${JSON.stringify(body)}`);
        const condition = { "_id": assignmentId };
        Assignment.findOneAndUpdate(
            condition,
            body,
            (error: Error) => {
                if (error) { console.log(error); }
            });
    }

    setAssignmentResult(assignmentResultId: string, body: any) {
        SurveyService.dbgMsg(`Setting Assignment Result ${assignmentResultId}: ${JSON.stringify(body)}`);
        const condition = { "_id": assignmentResultId };
        AssignmentResults.findOneAndUpdate(
            condition,
            body,
            (error: Error) => {
                if (error) { console.log(error); }
            });
    }

    saveNewAssignmentResult(assignmentId: string, userId: String, publishAt: any) {
        SurveyService.dbgMsg(`Saving new Assignment Result for ${assignmentId} of user ${userId}`);
        var newAR = new AssignmentResults();
        newAR
            .set("assignment", assignmentId)
            .set("userId", userId)
            .set("publishAt", publishAt)
            .set("expireAt", this.getExpireAtMoment(publishAt))
            .save();
    }
}

function addPublishAtToAssignmentsBasedOnUser(assignments: any, userId: String) {
    assignments.forEach((a: {
        [x: string]: any;
    }) => {
        if (!a['publishAt']) {
            var publishAtMoment = getPublishAtForAssignmentBasedOnUser(a.publishFrom, a.publishTo, a._id, userId)
            a['publishAt'] = publishAtMoment.toDate()
            a['expireAt'] = publishAtMoment.add(EXPIRE_DEFAULT_AFTER_PUBLISH_MINUTES, "m").toDate()
        }
    });
}

function getPublishAtForAssignmentBasedOnUser(publishFrom: any, publishTo: any, assignmentId: String, userId: String) {

    //TODO: take user tz into concern

    let minuteDiff = moment(publishTo).diff(moment(publishFrom), "minutes", true);
    var skew = SurveyService.pseudorandomSkew(assignmentId, userId, minuteDiff);
    return moment(publishFrom, "Europe/Stockholm").add(skew, "m");
}
