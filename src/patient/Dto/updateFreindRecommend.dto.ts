import { IsBoolean, IsInt } from "class-validator";

export class UpdateFriendRecommendDto {
    @IsInt()
    id: number

    @IsBoolean()
    useFlag: boolean
}