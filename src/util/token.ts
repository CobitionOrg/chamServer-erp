export function getToken(header){
    const auth = header.authorization;
    const head = auth.split(' ');

    return head[1];
}