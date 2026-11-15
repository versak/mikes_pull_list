import type { PageServerLoad } from './$types';
import { getPullList } from '$lib/server/pulllist';

export const load: PageServerLoad = () => getPullList();
