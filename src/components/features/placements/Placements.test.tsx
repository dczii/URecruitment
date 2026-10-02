// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {afterEach,expect,it,vi} from 'vitest';
import {Placements} from './Placements';
import {setStoredRecruiterName} from '@/lib/recruiter-name';
const save=vi.hoisted(()=>vi.fn());
vi.mock('@/app/placements/actions',()=>({savePlacementAction:save}));
afterEach(()=>{cleanup();localStorage.clear();save.mockReset();});
it('preserves the date and focuses its error when the save fails',async()=>{
 setStoredRecruiterName('Fictional Recruiter');
 save.mockResolvedValue({ok:false,error:'Enter a valid date.'});
 render(<Placements items={[{pipelineEntryId:'fictional-entry',candidateId:'fictional-candidate',candidateName:'Fictional Candidate',jobId:'fictional-job',jobTitle:'Fictional Engineer',clientName:'Fictional Client',placementId:null,startDate:null,guaranteePeriodDays:null,guaranteeEndDate:null,daysUsed:null,flag:null}]} />);
 const date=screen.getByLabelText('Start date for Fictional Candidate');
 fireEvent.change(date,{target:{value:'2026-10-02'}});
 fireEvent.click(screen.getByRole('button',{name:'Confirm'}));
 await waitFor(()=>expect(date).toHaveFocus());
 expect(date).toHaveValue('2026-10-02');
 expect(date).toHaveAttribute('aria-invalid','true');
 expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid date.');
});
