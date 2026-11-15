import type { PageServerLoad } from './$types';
import { metronConfigured } from '$lib/server/metron';
import { getSettings } from '$lib/server/pulllist';

export const load: PageServerLoad = () => ({ settings: getSettings(), metronConfigured: metronConfigured() });
