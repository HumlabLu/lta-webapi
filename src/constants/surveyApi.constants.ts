export const PING_MESSAGE = "pong from surveyApi =)";
export const PORT = 9001;
// export const WEBAPP_URL = "http://ht-lang-track.ht.lu.se:443/";

export const MONGO_URL = "mongodb://localhost:27017/Survey";
// export const MONGO_URL = "mongodb://mongodb:27017/Survey";

export const ADMIN_USERNAMES = ["josef", "stephan", "henriette", "jonas", "marianne"]

export const JMESPATH_dataset = `{
    "userId": userId,
    "_id": _id,
    "createdAt": createdAt,
    "publishAt": publishAt,
    "expireAt": expireAt,
    "firstOpenedAt": firstOpenedAt,
    "lastOpenedAt": lastOpenedAt,
    "dataset._id": dataset._id,
    "dataset.createdAt": dataset.createdAt
    `;

export const NOTIFICATION_CHECK_INTERVAL_MS = 10 * 1000; // how often do we check if it's time to send a notif

export const NOTIFY_PUBLISH_SINCE_MINUTES = 30; // for catching up, how long back should we still send notifs for.
export const NOTIFY_EXPIRE_IN_MINUTES = 30; // if not answered when 30 minutes before expiration, second notif goes out, should be 30 in prod

export const EXPIRE_DEFAULT_AFTER_PUBLISH_MINUTES = 60; // how long from publish to expiration, should be 60 in prod