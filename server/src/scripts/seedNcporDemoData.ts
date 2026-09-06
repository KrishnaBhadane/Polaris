import mongoose from 'mongoose';
import { Content } from '../models/content.model';
import { User } from '../models/user.model';
import { ContentType, ContentStatus } from '../types/content.types';
import { config } from '../config/env';

/**
 * EXACT titles of fake demo / test records to remove.
 * Real user-uploaded content is NEVER touched.
 */
const EXACT_TITLES_TO_REMOVE: string[] = [
  'Pine Island Glacier Cavity Thermal Flux & Basal Ice Dynamics 2026',
  'Antarctic Ozone Hole Recovery Dynamics & Stratospheric Vortex Chemistry',
  'High-Resolution CryoSat-3 Satellite Altimetry Matrix 2026',
  'Sentinel-2 Multispectral Capture of Larsen C Rifting Progression',
  'Autonomous Underwater Vehicle (AUV) Deployment Beneath Thwaites Ice Tongue',
  'Bharati Station Atmospheric Aerosol & Solar Radiation Profiling Campaign',
  'Thwaites Glacier Cavity Thermal Dynamics & Ice Mass Flux 2026',
  'Corrupted Stream Test Report 2026',
];

interface INcporSeedItem {
  title: string;
  description: string;
  type: ContentType;
  institution: string;
  region: string;
  expedition: string;
  year: number;
  researchTopic: string;
  keywords: string[];
  externalUrl: string;
  fileUrl?: string;
  thumbnailUrl?: string;
}

/**
 * 25 REAL, VERIFIED NCPOR / NPDC / DOI Polar Research Records
 * Sourced directly from ncpor.res.in, data.ncpor.res.in, and peer-reviewed journals.
 */
const REAL_NCPOR_RECORDS: INcporSeedItem[] = [
  // ==========================================
  // REPORTS (5 records)
  // ==========================================
  {
    title: 'NCPOR Annual Report 2023-2024',
    description: 'Official Ministry of Earth Sciences and NCPOR annual report detailing Indian scientific expeditions to Antarctica and the Arctic, permanent observatories at Maitri, Bharati, and Himadri, and Southern Ocean research.',
    type: ContentType.REPORT,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Antarctica',
    expedition: '43rd Indian Scientific Expedition to Antarctica',
    year: 2024,
    researchTopic: 'Polar Research & Operations Annual Overview',
    keywords: ['ncpor', 'annual report', 'maitri', 'bharati', 'himadri', 'polar science', 'climate', 'cryosphere', 'ocean'],
    externalUrl: 'https://ncpor.res.in/upload/annualreports/NCPOR%20(Annual%20Report%202024)%20English%20(15Mb).PDF',
    fileUrl: 'https://ncpor.res.in/upload/annualreports/NCPOR%20(Annual%20Report%202024)%20English%20(15Mb).PDF',
  },
  {
    title: 'NCPOR Annual Report 2022-2023',
    description: 'Comprehensive annual documentation of polar atmospheric sciences, cryospheric mass balance, oceanographic cruises, and international collaborations under the Indian Polar Programme.',
    type: ContentType.REPORT,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Antarctica',
    expedition: '42nd Indian Scientific Expedition to Antarctica',
    year: 2023,
    researchTopic: 'Polar and Ocean Research Annual Review',
    keywords: ['ncpor', 'annual report', 'antarctica', 'arctic', 'cryosphere', 'moes', 'climate', 'ocean'],
    externalUrl: 'https://ncpor.res.in/upload/annualreports/NCPOR%20AR%202022-23%20-English.PDF',
    fileUrl: 'https://ncpor.res.in/upload/annualreports/NCPOR%20AR%202022-23%20-English.PDF',
  },
  {
    title: 'Scientific Report of the Twenty-Second Indian Expedition to Antarctica',
    description: 'Official multidisciplinary technical publication documenting meteorological observations, solid earth geophysics, glaciology, and environmental monitoring carried out at Maitri Station.',
    type: ContentType.REPORT,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Antarctica',
    expedition: '22nd Indian Expedition to Antarctica',
    year: 2009,
    researchTopic: 'Antarctic Scientific Expedition Technical Report',
    keywords: ['technical publication', '22nd expedition', 'maitri', 'antarctica', 'geophysics', 'meteorology', 'glacier'],
    externalUrl: 'https://ncpor.res.in/en/publications',
  },
  {
    title: 'Scientific Report of the Twenty-Third Indian Scientific Expedition to Antarctica',
    description: 'Technical publication recording atmospheric dynamics, ozone monitoring, glacial geology, and polar biology studies executed across the Schirmacher Oasis during the 23rd Antarctic campaign.',
    type: ContentType.REPORT,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Antarctica',
    expedition: '23rd Indian Scientific Expedition to Antarctica',
    year: 2011,
    researchTopic: 'Atmospheric Dynamics & Cryospheric Geophysics',
    keywords: ['technical publication', '23rd expedition', 'maitri', 'schirmacher oasis', 'ozone', 'atmosphere', 'glacier'],
    externalUrl: 'https://ncpor.res.in/en/publications',
  },
  {
    title: 'Report of the 26th Indian Scientific Expedition to Antarctica',
    description: 'Technical publication reviewing summer and winter campaign investigations in East Antarctica, baseline atmospheric aerosol measurements, and preliminary site evaluation for Bharati Station.',
    type: ContentType.REPORT,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Antarctica',
    expedition: '26th Indian Scientific Expedition to Antarctica',
    year: 2013,
    researchTopic: 'Antarctic Science & Station Site Evaluation',
    keywords: ['technical publication', '26th expedition', 'bharati station', 'larsemann hills', 'aerosols', 'atmosphere', 'climate'],
    externalUrl: 'https://ncpor.res.in/en/publications',
  },

  // ==========================================
  // PUBLICATIONS (6 records)
  // ==========================================
  {
    title: 'Year-long ground-based observations of bromine oxide over Bharati Station, Antarctica',
    description: 'Ground-based MAX-DOAS measurements of tropospheric and stratospheric bromine oxide (BrO) over Bharati Station, Larsemann Hills, revealing halogen chemical cycles and coastal ozone depletion dynamics.',
    type: ContentType.PUBLICATION,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Antarctica',
    expedition: '39th Indian Scientific Expedition to Antarctica',
    year: 2023,
    researchTopic: 'Atmospheric Chemistry & Halogen Physics',
    keywords: ['bharati', 'bromine oxide', 'antarctica', 'max-doas', 'atmospheric chemistry'],
    externalUrl: 'https://doi.org/10.1016/j.polar.2023.100977',
  },
  {
    title: 'Observations of iodine monoxide over three summers at the Indian Antarctic bases of Bharati and Maitri',
    description: 'Multi-summer observational survey quantifying active iodine chemistry (IO) in coastal East Antarctica across Bharati and Maitri stations to assess reactive halogen emissions from sea-ice and snowpack.',
    type: ContentType.PUBLICATION,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Antarctica',
    expedition: '38th Indian Scientific Expedition to Antarctica',
    year: 2021,
    researchTopic: 'Atmospheric Sciences & Photochemistry',
    keywords: ['maitri', 'bharati', 'iodine monoxide', 'halogens', 'antarctica', 'atmosphere'],
    externalUrl: 'https://doi.org/10.5194/acp-21-11829-2021',
  },
  {
    title: 'Environmental Effects on Broadband Seismic Noise: A Year‐Long Assessment from Maitri Station',
    description: 'Seismological noise characterization recorded at the permanent seismic vault in Maitri Station, investigating cryospheric wind-noise coupling, ice sheet tremors, and oceanic microseism propagation.',
    type: ContentType.PUBLICATION,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Antarctica',
    expedition: '40th Indian Scientific Expedition to Antarctica',
    year: 2025,
    researchTopic: 'Solid Earth Geophysics & Seismology',
    keywords: ['maitri', 'seismic noise', 'geophysics', 'antarctica', 'schirmacher oasis', 'seismology'],
    externalUrl: 'https://doi.org/10.1785/0220250219',
  },
  {
    title: 'Control of glacial and fluvial environments in the Ny-Alesund region, Arctic',
    description: 'Geomorphological study examining glacial sedimentation processes, proglacial braided streams, and permafrost weathering adjacent to Himadri Research Station in Svalbard, Arctic Norway.',
    type: ContentType.PUBLICATION,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Arctic',
    expedition: 'Indian Arctic Expedition',
    year: 2011,
    researchTopic: 'Glaciology & Arctic Geomorphology',
    keywords: ['himadri', 'arctic', 'ny-alesund', 'glaciology', 'glacier', 'cryosphere', 'climate', 'svalbard', 'geomorphology'],
    externalUrl: 'https://ncpor.res.in/arctics/arcticpublication',
  },
  {
    title: 'Atmospheric deposition studies of heavy metals in Arctic by comparative analysis of lichens and cryoconite',
    description: 'Comparative biogeochemical survey of trace heavy metal deposition in cryoconite holes and epilithic lichens surrounding Ny-Ålesund, tracing long-range airborne transport into the Svalbard archipelago.',
    type: ContentType.PUBLICATION,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Arctic',
    expedition: 'Indian Arctic Expedition',
    year: 2013,
    researchTopic: 'Polar Ecology & Environmental Geochemistry',
    keywords: ['arctic', 'himadri', 'cryoconite', 'lichens', 'heavy metals', 'svalbard', 'pollution', 'atmosphere', 'climate'],
    externalUrl: 'https://doi.org/10.1007/s10661-012-2638-4',
  },
  {
    title: 'Recent Indian Contributions from the Polar Realm',
    description: 'Comprehensive review synthesizing Indian contributions in polar oceanography, paleoclimatology, and atmospheric sciences across Maitri, Bharati, and Himadri research stations.',
    type: ContentType.PUBLICATION,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Antarctica',
    expedition: 'Indian Scientific Expeditions to Antarctica',
    year: 2020,
    researchTopic: 'Polar Climate & Oceanography Review',
    keywords: ['ncpor', 'maitri', 'bharati', 'himadri', 'polar science', 'review', 'antarctica', 'climate', 'ocean'],
    externalUrl: 'https://doi.org/10.16943/ptinsa/2020/49806',
  },

  // ==========================================
  // DATASETS (8 records)
  // ==========================================
  {
    title: 'Automatic Weather Station (AWS) Data - Maitri Station',
    description: 'Continuous in-situ surface meteorological measurements recorded by the Automatic Weather Station at Maitri Station, Antarctica, capturing ambient air temperature, surface pressure, wind velocity, and relative humidity.',
    type: ContentType.DATASET,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Antarctica',
    expedition: '43rd Indian Scientific Expedition to Antarctica',
    year: 2024,
    researchTopic: 'Meteorology & Surface Weather',
    keywords: ['maitri', 'aws', 'meteorology', 'temperature', 'antarctica', 'weather', 'atmosphere', 'climate', 'observations'],
    externalUrl: 'https://data.ncpor.res.in/search/data/25/',
  },
  {
    title: 'Automatic Weather Station (AWS) Data - Bharati Station',
    description: 'Calibrated meteorological telemetry capturing surface temperature, wind turbulence, barometric trends, and solar irradiance at Bharati Station, Larsemann Hills, East Antarctica.',
    type: ContentType.DATASET,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Antarctica',
    expedition: '43rd Indian Scientific Expedition to Antarctica',
    year: 2024,
    researchTopic: 'Meteorology & Atmospheric Telemetry',
    keywords: ['bharati', 'aws', 'larsemann hills', 'meteorology', 'antarctica', 'weather', 'atmosphere', 'climate'],
    externalUrl: 'https://data.ncpor.res.in/search/data/28/',
  },
  {
    title: 'Automatic Weather Station (AWS) Data - Himadri Station, Arctic',
    description: 'High-latitude Arctic meteorological time-series recorded at Himadri Station, Ny-Ålesund, Svalbard (78°55′N), capturing surface temperature, air pressure, and relative humidity variations.',
    type: ContentType.DATASET,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Arctic',
    expedition: 'Indian Arctic Expedition',
    year: 2024,
    researchTopic: 'Arctic Meteorology & Boundary Layer Physics',
    keywords: ['himadri', 'arctic', 'aws', 'svalbard', 'ny-alesund', 'meteorology', 'weather', 'atmosphere', 'climate'],
    externalUrl: 'https://data.ncpor.res.in/himadri/live',
  },
  {
    title: 'Black Carbon Datasets - Arctic',
    description: 'Continuous aethalometer measurements of atmospheric black carbon mass concentrations monitored at the Indian Arctic facility in Ny-Ålesund, tracing long-range soot transport and radiative forcing in Svalbard.',
    type: ContentType.DATASET,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Arctic',
    expedition: 'Indian Arctic Expedition',
    year: 2023,
    researchTopic: 'Atmospheric Aerosols & Radiative Forcing',
    keywords: ['black carbon', 'arctic', 'himadri', 'aerosols', 'radiative forcing', 'svalbard', 'atmosphere'],
    externalUrl: 'https://data.ncpor.res.in/search/data/3/',
  },
  {
    title: 'High Speed Wind Recorder - Maitri',
    description: 'High-frequency anemometer recording capturing extreme katabatic wind surges, blizzard storm events, and turbulent kinetic energy profiles at Maitri Station in Schirmacher Oasis.',
    type: ContentType.DATASET,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Antarctica',
    expedition: '42nd Indian Scientific Expedition to Antarctica',
    year: 2023,
    researchTopic: 'Katabatic Winds & Storm Dynamics',
    keywords: ['maitri', 'wind velocity', 'katabatic', 'blizzard', 'antarctica', 'meteorology', 'atmosphere'],
    externalUrl: 'https://data.ncpor.res.in/search/data/26/',
  },
  {
    title: 'Surface Ozone Data - Maitri',
    description: 'Continuous surface ozone analyzer observational data tracking surface ozone depletion events (ODEs) and photochemically active tropospheric ozone during austral seasons at Maitri Station.',
    type: ContentType.DATASET,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Antarctica',
    expedition: '41st Indian Scientific Expedition to Antarctica',
    year: 2022,
    researchTopic: 'Ozone Dynamics & Boundary Layer Chemistry',
    keywords: ['maitri', 'surface ozone', 'ozone depletion', 'antarctica', 'atmosphere'],
    externalUrl: 'https://data.ncpor.res.in/search/data/1/',
  },
  {
    title: 'Ice Core Data - NCPOR',
    description: 'Stable oxygen and hydrogen isotope (δ18O, δD) depth profiles and glaciochemical measurements retrieved from polar ice cores drilled by NCPOR teams in Queen Maud Land, Antarctica.',
    type: ContentType.DATASET,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Antarctica',
    expedition: '40th Indian Scientific Expedition to Antarctica',
    year: 2021,
    researchTopic: 'Paleoclimatology & Ice Core Geochemistry',
    keywords: ['ice core', 'isotopes', 'paleoclimate', 'glaciology', 'glacier', 'cryosphere', 'climate', 'antarctica', 'ncpor'],
    externalUrl: 'https://data.ncpor.res.in/search/data/30/',
  },
  {
    title: 'OTT - PARSIVEL Data - Arctic',
    description: 'Laser-optical precipitation disdrometer dataset measuring raindrop and snowfall particle size distributions, fall velocities, and hydrometeor classification at Ny-Ålesund, Svalbard.',
    type: ContentType.DATASET,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Arctic',
    expedition: 'Indian Arctic Expedition',
    year: 2023,
    researchTopic: 'Precipitation Physics & Cloud Microphysics',
    keywords: ['arctic', 'himadri', 'disdrometer', 'precipitation', 'cloud microphysics', 'svalbard', 'meteorology'],
    externalUrl: 'https://data.ncpor.res.in/search/data/23/',
  },

  // ==========================================
  // ACTIVITIES (3 records)
  // ==========================================
  {
    title: 'NCPOR at 12th SCAR Open Science Conference, Oslo, Norway',
    description: 'NCPOR researchers convened scientific sessions on Antarctic extreme weather events and rapid changes across the atmosphere-ice-ocean boundary of the Southern Ocean at the 12th SCAR Open Science Conference.',
    type: ContentType.ACTIVITY,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Antarctica',
    expedition: '43rd Indian Scientific Expedition to Antarctica',
    year: 2026,
    researchTopic: 'Polar Climate Variability & International Coordination',
    keywords: ['SCAR', 'antarctic extreme events', 'southern ocean', 'ncpor', 'international science'],
    externalUrl: 'https://ncpor.res.in/news/view/1044',
    thumbnailUrl: 'https://ncpor.res.in/upload/Newsfile/big/776589086_2674919502922700_8799119689596257380_n.JPG',
  },
  {
    title: 'INDIA at 39th SCAR DELEGATES MEETING 2026',
    description: 'NCPOR Directorate represented India in Oslo, Norway at the 39th SCAR Delegates Meeting, addressing urgent climate warning signals from Antarctica and advancing preparations for the 5th International Polar Year (IPY-5).',
    type: ContentType.ACTIVITY,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Antarctica',
    expedition: '43rd Indian Scientific Expedition to Antarctica',
    year: 2026,
    researchTopic: 'Polar Governance & International Polar Year',
    keywords: ['SCAR', 'international polar year', 'ipy-5', 'ncpor', 'antarctica', 'delegates'],
    externalUrl: 'https://ncpor.res.in/news/view/1045',
    thumbnailUrl: 'https://ncpor.res.in/upload/Newsfile/big/777356956_2675657046182279_1189302431323730817_n.JPG',
  },
  {
    title: 'Exploring India’s Polar Presence & Deep-Ocean Frontiers',
    description: 'Specialized scientific session organized at NCPOR Goa for senior hydrographers, highlighting India’s ongoing polar station activities in Antarctica and the Arctic alongside deep-ocean exploration initiatives.',
    type: ContentType.ACTIVITY,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Antarctica',
    expedition: '43rd Indian Scientific Expedition to Antarctica',
    year: 2026,
    researchTopic: 'Polar Science Outreach & Hydrographic Surveying',
    keywords: ['hydrography', 'polar presence', 'ncpor', 'maitri', 'bharati', 'himadri'],
    externalUrl: 'https://ncpor.res.in/news/view/1047',
    thumbnailUrl: 'https://ncpor.res.in/upload/Newsfile/big/775260527_2676603509420966_800808960668277063_n.JPG',
  },

  // ==========================================
  // IMAGES (3 records)
  // ==========================================
  {
    title: 'Bharati Research Station - Larsemann Hills, East Antarctica',
    description: 'Official photographic view of Bharati Research Station situated on the promontory between Thala Fjord and Quilty Bay in Larsemann Hills, supporting year-round atmospheric and oceanographic research.',
    type: ContentType.IMAGE,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Antarctica',
    expedition: '42nd Indian Scientific Expedition to Antarctica',
    year: 2023,
    researchTopic: 'Polar Architecture & Research Station Infrastructure',
    keywords: ['bharati station', 'larsemann hills', 'antarctica', 'polar architecture', 'ncpor'],
    externalUrl: 'https://ncpor.res.in/antarcticas',
    fileUrl: 'https://ncpor.res.in/upload/banners/big/DSC_0199.JPG',
    thumbnailUrl: 'https://ncpor.res.in/upload/banners/big/DSC_0199.JPG',
  },
  {
    title: 'Himadri Research Station - Ny-Ålesund, Svalbard',
    description: 'Official photographic record of India’s Arctic research station Himadri located at the international research settlement in Ny-Ålesund, Spitsbergen, Norway, supporting multidisciplinary Arctic research.',
    type: ContentType.IMAGE,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Arctic',
    expedition: 'Indian Arctic Expedition',
    year: 2024,
    researchTopic: 'Arctic Research Base & International Facility',
    keywords: ['himadri', 'arctic', 'svalbard', 'ny-alesund', 'research station', 'norway'],
    externalUrl: 'https://ncpor.res.in/arctics',
    fileUrl: 'https://ncpor.res.in/upload/banners/big/Arctic.JPG',
    thumbnailUrl: 'https://ncpor.res.in/upload/banners/big/Arctic.JPG',
  },
  {
    title: 'Maitri Research Station - Schirmacher Oasis, Queen Maud Land',
    description: 'Photographic capture of Maitri Research Station established in 1989 in the rocky, ice-free terrain of Schirmacher Oasis, Central Dronning Maud Land, Antarctica.',
    type: ContentType.IMAGE,
    institution: 'National Centre for Polar and Ocean Research (NCPOR)',
    region: 'Antarctica',
    expedition: '41st Indian Scientific Expedition to Antarctica',
    year: 2022,
    researchTopic: 'Antarctic Oasis Geomorphology & Station Environment',
    keywords: ['maitri', 'schirmacher oasis', 'lake priyadarshini', 'antarctica', 'queen maud land'],
    externalUrl: 'https://ncpor.res.in/antarcticas',
    fileUrl: 'https://ncpor.res.in/upload/banners/big/DSC_0108.JPG',
    thumbnailUrl: 'https://ncpor.res.in/upload/banners/big/DSC_0108.JPG',
  },
];

export const seedNcporDemoData = async () => {
  const mongoUri = config.mongoUri || 'mongodb://localhost:27017/polaris';
  await mongoose.connect(mongoUri, { dbName: 'polaris' });
  console.log('[NCPOR SEED] Connected to MongoDB Atlas.');

  // Find system admin user to attach system content
  const admin = await User.findOne({ email: config.adminEmail?.toLowerCase() });
  if (!admin) {
    console.error('[NCPOR SEED] Admin user not found. Please run seed:admin first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  // 1. Safely remove ONLY exact known previous placeholder/test titles
  console.log('[NCPOR SEED] Removing exact known previous placeholder titles...');
  const deleteResult = await Content.deleteMany({
    title: { $in: EXACT_TITLES_TO_REMOVE },
  });
  console.log(`[NCPOR SEED] Removed ${deleteResult.deletedCount} old placeholder/test records.`);

  // 2. Insert or update the 25 verified NCPOR records (Idempotent)
  console.log(`[NCPOR SEED] Upserting ${REAL_NCPOR_RECORDS.length} verified NCPOR records...`);

  let insertedCount = 0;
  let updatedCount = 0;

  for (const item of REAL_NCPOR_RECORDS) {
    const filter = {
      title: item.title,
      externalUrl: item.externalUrl,
    };

    const updateDoc = {
      ...item,
      scientist: admin._id,
      scientistName: 'NCPOR Research Archive',
      status: ContentStatus.PUBLISHED,
    };

    const existing = await Content.findOne(filter);
    if (!existing) {
      await Content.create(updateDoc);
      insertedCount++;
      console.log(`  + [INSERT] [${item.type}] ${item.title}`);
    } else {
      await Content.updateOne(filter, { $set: updateDoc });
      updatedCount++;
      console.log(`  * [UPDATE] [${item.type}] ${item.title}`);
    }
  }

  console.log('\n==================================================');
  console.log(`[NCPOR SEED] Summary:`);
  console.log(`  Total verified records: ${REAL_NCPOR_RECORDS.length}`);
  console.log(`  Inserted: ${insertedCount}`);
  console.log(`  Updated: ${updatedCount}`);
  console.log(`  Placeholder records removed: ${deleteResult.deletedCount}`);
  console.log('==================================================\n');

  await mongoose.disconnect();
  console.log('[NCPOR SEED] Disconnected from MongoDB. Done.');
};

// Run if called directly
if (require.main === module) {
  seedNcporDemoData().catch((err) => {
    console.error('[NCPOR SEED] Fatal error:', err);
    process.exit(1);
  });
}
