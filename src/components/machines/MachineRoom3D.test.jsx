import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import MachineRoom3D, {WorkshopControls} from './MachineRoom3D';
jest.mock('@react-three/fiber',()=>({Canvas:({children})=><div>{children}</div>,useFrame:()=>{}}));
jest.mock('@react-three/drei',()=>({Html:({children,transform,distanceFactor,occlude})=><div data-testid="html" data-distance-factor={distanceFactor} data-occlude={String(!!occlude)} data-perspective={String(!!transform)}>{children}</div>,OrbitControls:()=>null,useGLTF:()=>({scene:{clone:()=>({traverse:()=>{}})}})}));
jest.mock('../../services/waxRpcRead',()=>({postWaxRpc:jest.fn().mockResolvedValue({rows:[]})}));
test('console buttons fire once without sending pointer or click events to camera parents',()=>{
 const orbit=jest.fn(),claim=jest.fn();
 render(<div onPointerDown={orbit} onPointerUp={orbit} onClick={orbit}><WorkshopControls><button onClick={claim}>Collect</button></WorkshopControls></div>);
 const button=screen.getByText('Collect');fireEvent.pointerDown(button);fireEvent.pointerUp(button);fireEvent.click(button);
 expect(claim).toHaveBeenCalledTimes(1);expect(orbit).not.toHaveBeenCalled();
});
test('ready reactor can collect with zero CINDER and surfaces claim failure',()=>{
 // Three primitives are inert in this DOM test; WebGL is verified in the browser.
 const warning=jest.spyOn(console,'error').mockImplementation(()=>{});
 const machine={machine_id:87095,last_start:1700000000,isRunning:true,canClaim:true};const claim=jest.fn();
 const props={machines:[machine],selectedId:87095,onSelect:jest.fn(),recipe:{cooldown_sec:60,energy_per_batch:100},now:1700000100000,energy:0,cinderBalance:0,onClaim:claim};
 const view=render(<MachineRoom3D {...props}/>);
 const button=screen.getByText('Collect compost');expect(button).toBeEnabled();fireEvent.click(button);expect(claim).toHaveBeenCalledWith(machine);
 expect(button.closest('[data-testid="html"]')).toHaveAttribute('data-perspective','false');
 expect(button.closest('[data-testid="html"]')).toHaveAttribute('data-distance-factor','4.5');
 expect(button.closest('[data-testid="html"]')).toHaveAttribute('data-occlude','true');
 view.rerender(<MachineRoom3D {...props} busyKey="claim-87095"/>);expect(screen.getByText('Collecting…')).toBeDisabled();
 view.rerender(<MachineRoom3D {...props} actionError="Wallet request cancelled"/>);expect(screen.getByRole('alert')).toHaveTextContent('Wallet request cancelled');expect(screen.getByText('Collect compost')).toBeEnabled();
 warning.mockRestore();
});
