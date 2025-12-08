import waxjs from '@waxio/waxjs/dist';

const wax = new waxjs.WaxJS({
  rpcEndpoint: process.env.REACT_APP_RPC,
});

export default wax;
