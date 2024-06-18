import { Injectable } from '@nestjs/common';
import { TalkRepositoy } from './talk.repository';

@Injectable()
export class TalkService {
    constructor(
        private readonly talkRepository: TalkRepositoy,
    ){}
}
