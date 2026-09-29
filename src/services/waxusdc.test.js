import {TOKENS,rawAmount,requireToken,reviewActions,minimumRaw} from './exchangeMath';
const wax=TOKENS.find(t=>t.key==='wax'),usd=TOKENS.find(t=>t.key==='waxusdc');
test('WAXUSDC requires the exact mainnet identity and six decimals',()=>{
 expect(usd).toMatchObject({symbol:'WAXUSDC',contract:'eth.token',precision:6});
 expect(rawAmount('1.000001',usd).toString()).toBe('1000001');
 expect(()=>rawAmount('1.0000001',usd)).toThrow();
 expect(()=>requireToken({...usd,symbol:'USDC'})).toThrow();
 expect(()=>requireToken({...usd,contract:'fake.token'})).toThrow();
});
test.each([[wax,usd],[usd,wax]])('WAX/WAXUSDC transfers use correct contract, precision and minimum', (input,output)=>{
 const now=Date.now(),inputRaw=rawAmount('1',input).toString(),outputRaw=rawAmount('2',output).toString();
 const q={network:'wax-mainnet',kind:'swap',actor:'maestrobeatz',poolId:'314',createdAt:now,expiresAt:now+30000,slippageBps:50,tokenA:wax,tokenB:usd,inputToken:input,outputToken:output,inputRaw,outputRaw};
 const [action]=reviewActions(q,now);
 expect(action.account).toBe(input.contract);expect(action.data.to).toBe('swap.alcor');
 expect(action.data.quantity).toBe(`1.${'0'.repeat(input.precision)} ${input.symbol}`);
 expect(action.data.memo).toContain(`@${output.contract}#`);
 expect(minimumRaw(outputRaw,50).toString()).toBe(rawAmount('1.99',output).toString());
});
