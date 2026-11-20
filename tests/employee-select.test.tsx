import {render,screen,fireEvent} from '@testing-library/react';
import {expect,it} from 'vitest';
import {EmployeeSelect} from '@/components/employee-select';
import {Member} from '@/lib/types';

it('keeps multiple selections while searching and submits all selected employees',()=>{
  const members=[{userId:'1',user:{displayName:'Alice',username:'alice',email:'alice@example.com'}},{userId:'2',user:{displayName:'Bob',username:'bob',email:'bob@example.com'}}] as Member[];
  const {container}=render(<form><EmployeeSelect label="Employees" name="memberIds" members={members}/></form>);
  fireEvent.click(screen.getByText('Select employees'));
  fireEvent.click(screen.getByRole('checkbox',{name:/Alice/}));
  fireEvent.change(screen.getByRole('searchbox'),{target:{value:'bob@'}});
  expect(screen.queryByRole('checkbox',{name:/Alice/})).toBeNull();
  fireEvent.click(screen.getByRole('checkbox',{name:/Bob/}));
  expect(new FormData(container.querySelector('form')!).getAll('memberIds')).toEqual(['1','2']);
  expect(screen.getByText('2 employees selected')).toBeTruthy();
});
