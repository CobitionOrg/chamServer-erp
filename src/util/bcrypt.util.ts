import * as bcrypt from 'bcrypt' 

export class BcryptUtilClass {

    async hashing(userPw:string){    
        try{
            const saltRound = 10; //암호화 연산에 사용되는 salt의 cost, 높을수록 암호화 연산이 증가하는 대신 속도가 느려짐
            const salt = await bcrypt.genSalt(saltRound);
            const hashedPassword = await bcrypt.hash(userPw,salt); //비밀번호 해쉬화
    
            return hashedPassword; //해쉬화한 비밀번호를 데이터베이스에 저장
        }catch(err){
            console.log(err);
        }
        
    }

    /**비밀번호 체크 */
    async checkLogin(userPw:string, dbPw:string){
        try{
            const check = await bcrypt.compare(userPw,dbPw);

            return check;
        }catch(err){
            console.log(err);
            return {success:false};
        }
    }
}