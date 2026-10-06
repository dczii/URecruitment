import { expect, test } from "./auth-fixture";
import { selectFieldOption } from "./seeded";

test("AC1–3: named workspace, actual identity and keyboard recovery", async ({page}, info) => {
  await page.goto('/settings');
  await expect(page).toHaveTitle('Settings | URecruitment');
  if(info.project.name === 'desktop') await expect(page.getByRole('link',{name:'Jobs',exact:true})).toHaveText('Jobs');
  if(info.project.name === 'phone') await page.getByRole('button',{name:'Open navigation'}).click();
  await page.getByRole('button',{name:'Account: Add name'}).click();
  await page.getByRole('menuitem',{name:'Add name'}).click();
  await page.getByLabel('Name',{exact:true}).fill('Fictional Recruiter');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByRole('button',{name:'Account: Fictional Recruiter'})).toContainText('Fictional Recruiter');
  await page.getByRole('button',{name:'Account: Fictional Recruiter'}).click();
  await page.getByRole('menuitem',{name:'Change name'}).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Account: Fictional Recruiter'})).toBeFocused();
});

test("AC4–7: aligned attention rows, reversible selection and filters", async ({page}) => {
  await page.goto('/dashboard');
  const table=page.getByRole('table').first();
  await expect(table.getByRole('columnheader')).toHaveCount(6);
  await expect(page.getByRole('complementary',{name:'Selection'})).toHaveCount(0);
  // Preview and local fixture datasets have different fictional names.
  // Verify that the control identifies the candidate it actually selects.
  const row = table.locator('tbody tr').first();
  const candidateName = (await row.locator('[data-label="Candidate"]').innerText()).trim();
  expect(candidateName).not.toBe('');
  const selection = row.getByRole('checkbox');
  await expect(selection).toHaveAccessibleName(`Select ${candidateName}`);
  await selection.check();
  await expect(selection).toBeChecked();
  await expect(page.getByRole('complementary',{name:'Selection'})).toContainText('1 candidate selected');
  await page.getByRole('button',{name:'Clear selection'}).click();
  await expect(page.getByRole('complementary',{name:'Selection'})).toHaveCount(0);
  await expect(selection).not.toBeChecked();
  await selectFieldOption(page, "Client", 1);
  await expect(page).toHaveURL(/client=/);
  await expect(page.getByRole('button',{name:'Clear filters'})).toBeVisible();
  await page.getByRole('button',{name:'Clear filters'}).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test("AC8–9: phone cards and first invalid field retain entries", async ({page}, info) => {
  await page.goto('/jobs');
  if(info.project.name === 'phone') expect(await page.locator('tbody tr').first().evaluate(e=>getComputedStyle(e).display)).toBe('grid');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.goto('/jobs/new');
  await page.getByLabel('Owner name').fill('Fictional Recruiter');
  await page.getByRole('button',{name:'Save job'}).click();
  await expect(page.getByLabel('Job title')).toBeFocused();
  await expect(page.getByLabel('Owner name')).toHaveValue('Fictional Recruiter');
});

test("AC11–12: keyboard and reduced motion do not move the dialog", async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/settings');
  if((page.viewportSize()?.width ?? 1440) < 1024) await page.getByRole('button',{name:'Open navigation'}).click();
  const add=page.getByRole('button',{name:'Account: Add name'});
  await add.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('menuitem',{name:'Add name'}).focus();
  await page.keyboard.press('Enter');
  const nameDialog=page.getByRole('dialog',{name:"What's your name?"});
  await expect(nameDialog).toBeVisible();
  const transition=await nameDialog.evaluate(e=>getComputedStyle(e).transitionDuration);
  expect(transition.split(',').every(x=>parseFloat(x)===0)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(add).toBeFocused();
});


test("AC8: long EN/ZH content and 200% text remain within the viewport", async ({page}, info) => {
  for (const route of ['/dashboard','/jobs','/search','/placements','/settings','/jobs/new']) {
    await page.goto(route);
    await page.addStyleTag({content:'html { font-size: 200% !important; }'});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), route).toBe(true);
  }
  // Exercise Chinese and long unbroken English through the actual form,
  // without depending on a particular seeded candidate or writing to the DB.
  const title = `Fictional${'Engineering'.repeat(16)}虚构职位`;
  const owner = '虚构招聘员用于验证中文文字换行与字体';
  await page.getByLabel('Job title').fill(title);
  await page.getByLabel('Owner name').fill(owner);
  const heading = page.getByRole('heading',{level:1});
  await expect(heading).toHaveText(`Create job — ${title}`);
  await expect(page.getByLabel('Owner name')).toHaveValue(owner);
  expect(await heading.evaluate(e=>getComputedStyle(e).fontFamily)).toMatch(/Noto Sans SC/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.goto('/dashboard');
  await page.screenshot({path:`test-results/design-${info.project.name}.png`,fullPage:true});
});
