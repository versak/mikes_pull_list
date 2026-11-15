import type { PageServerLoad } from './$types';
import { todayLocal } from '$lib/dates';
import { getNotes } from '$lib/server/pulllist';

export const load: PageServerLoad = () => ({ notes: getNotes(), today: todayLocal() });
