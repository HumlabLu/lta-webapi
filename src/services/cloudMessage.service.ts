import admin from "./firebaseAdmin.service";

export class CloudMessageService {

    public sendMessage(
        registrationToken: String,
        title: String = "Hey there!",
        body: String = "This is a notification from the Lang-Track-App."
    ) {

        var message = {
            token: registrationToken,
            notification: {
                title: title,
                body: body
            },
            android: {
                notification: {
                    sound: "default"
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: "default"
                    }
                }
            }
        };

        admin.messaging().send(message)
            .then(() => {
                console.log("Notification sent to " + registrationToken.substring(0, 9) + "…: " + title);
            });
    }
}