import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import {SwapRows,groupSwapTransactions} from './ExchangeActivity';
jest.mock('../services/alcorMainnet',()=>({fetchSwapActivity:jest.fn()}));
const row=(tx,id,time)=>({trx_id:tx,_id:id,time,tokenA:1,tokenB:-2,symbolA:'WAX',symbolB:'TRASH',pool:123});
const a=row('a'.repeat(64),'1','2026-09-29T20:00:00Z');
const b=row('b'.repeat(64),'2','2026-09-30T00:49:35Z');
test('groups nonadjacent transactions, removes duplicate IDs, sorts by time in both directions',()=>{
 const rows=[a,b,{...b,_id:'3'},a,{...a,_id:'4'}];
 const groups=groupSwapTransactions(rows);
 expect(groups.map(g=>g.id)).toEqual([b.trx_id,a.trx_id]);
 expect(groups.map(g=>g.rows.length)).toEqual([2,2]);
 expect(groupSwapTransactions(rows,true).map(g=>g.id)).toEqual([a.trx_id,b.trx_id]);
});
test('does not discard distinct identical swaps or unknown record IDs',()=>{
 expect(groupSwapTransactions([a,{...a,_id:'other'},{...a,_id:undefined},{...a,_id:undefined}])[0].rows).toHaveLength(4);
});
test('renders one collapsible group and one explorer link per transaction',()=>{
 render(<SwapRows rows={[a,b,b]}/>);
 expect(screen.getAllByText(/Transaction [ab]{8}/)).toHaveLength(2);
 expect(screen.getAllByText('View transaction ↗')).toHaveLength(2);
 const summary=screen.getByText('Transaction bbbbbbbb').closest('summary');
 expect(summary.parentElement).not.toHaveAttribute('open');
 fireEvent.click(summary);
 expect(screen.getAllByText('Pool #123')).toHaveLength(2);
});
