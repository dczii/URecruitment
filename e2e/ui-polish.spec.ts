import { expect, test } from "@playwright/test";

test("AC1–3: named workspace, actual identity and keyboard recovery", async ({page}, info) => {
  await page.goto('/settings');
  await expect(page).toHaveTitle('Settings | URecruitment');
  if(info.project.name === 'desktop') await expect(page.getByRole('link',{name:'Jobs',exact:true})).toHaveText('Jobs');
  await page.getByRole('button',{name:'Add name'}).click();
  await page.getByLabel('Name',{exact:true}).fill('Fictional Recruiter');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByRole('button',{name:'Change recruiter name'})).toContainText('Fictional Recruiter');
  await page.getByRole('button',{name:'Change recruiter name'}).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Change recruiter name'})).toBeFocused();
});

test("AC4–7: aligned attention rows, reversible selection and filters", async ({page}) => {
  await page.goto('/dashboard');
  const table=page.getByRole('table').first();
  await expect(table.getByRole('columnheader')).toHaveCount(6);
  await expect(page.getByRole('complementary',{name:'Selection'})).toHaveCount(0);
  await page.getByRole('checkbox',{name:'Select Fictional Candidate',exact:true}).check();
  await expect(page.getByRole('complementary',{name:'Selection'})).toContainText('1 candidate selected');
  await page.getByRole('button',{name:'Clear selection'}).click();
  await expect(page.getByRole('complementary',{name:'Selection'})).toHaveCount(0);
  await page.getByLabel('Client',{exact:true}).selectOption('Fictional Client');
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
  const add=page.getByRole('button',{name:'Add name'});
  await add.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  const transition=await page.getByRole('dialog').evaluate(e=>getComputedStyle(e).transitionDuration);
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
  await page.goto('/dashboard');
  await expect(page.getByText('虚构候选人',{exact:true})).toBeVisible();
  await page.screenshot({path:`test-results/design-${info.project.name}.png`,fullPage:true});
});
