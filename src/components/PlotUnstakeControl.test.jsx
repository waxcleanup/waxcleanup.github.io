import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlotUnstakeControl from './PlotUnstakeControl';
const plot={owner:'tester',plot_asset_id:'123',slots:[{state:'EMPTY'}]};
test('owner can unstake empty plot using existing handler',()=>{const fn=jest.fn();render(<PlotUnstakeControl plot={plot} wallet="tester" onUnstake={fn}/>);fireEvent.click(screen.getByRole('button'));expect(fn).toHaveBeenCalledWith('123');});
test.each(['GROWING','READY'])('a crop in any slot blocks unstaking: %s',state=>{render(<PlotUnstakeControl plot={{...plot,slots:[{state:'EMPTY'},{state}]}} wallet="tester"/>);expect(screen.getByRole('button')).toBeDisabled();expect(screen.getByText(/all crops/)).toBeInTheDocument();});
test('other owners and pending transactions cannot unstake',()=>{const v=render(<PlotUnstakeControl plot={plot} wallet="other"/>);expect(screen.getByRole('button')).toBeDisabled();v.rerender(<PlotUnstakeControl plot={plot} wallet="tester" pending unstaking/>);expect(screen.getByRole('button',{name:'Unstaking…'})).toBeDisabled();});
