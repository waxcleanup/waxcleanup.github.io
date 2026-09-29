import React from 'react';
import {render, fireEvent} from '@testing-library/react';
import TokenLogo from './TokenLogo';
test('known game labels get logos, while a different contract never borrows the logo',()=>{
 const {container,rerender}=render(<TokenLogo symbol="CINDER" size={16}/>);
 expect(container.querySelector('img').getAttribute('width')).toBe('16');
 expect(container.querySelector('img').getAttribute('alt')).toBe('');
 rerender(<TokenLogo token={{symbol:'CINDER',contract:'other.token',precision:6}}/>);
 expect(container.querySelector('img').getAttribute('src')).toBe('https://wax.alcor.exchange/api/v2/tokens/cinder-other.token/logo');
});
test('failed images fall back without losing the surrounding currency label',()=>{
 const {container}=render(<span><TokenLogo symbol="WAX"/>10 WAX</span>);
 fireEvent.error(container.querySelector('img'));
 expect(container.querySelector('img')).toBeNull();
 expect(container.textContent).toContain('10 WAX');
});