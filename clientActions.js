export async function executeClientAction({
    action,
    sock,
    msg,
    sender
}) {

    switch (action) {

        case "recover_view_once":
            break;

        case "kick":
            break;

        case "promote":
            break;

        default:
            return false;

    }

    return true;

}
