import { HttpException } from "@nestjs/common";
import { HttpStatusCode } from "axios";

export function getToken(header){
    const auth = header.authorization;
    console.log(auth);
    if(!auth) {
        throw new HttpException('Forbidden', HttpStatusCode.Unauthorized);
    }
    const head = auth.split(' ');

    return head[1];
}