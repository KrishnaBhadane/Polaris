import mongoose from 'mongoose';
import { Content } from '../models/content.model';
import { User } from '../models/user.model';
import { ContentType, ContentStatus } from '../types/content.types';
import { config } from '../config/env';

const seedDiverseContent = async () => {
  const mongoUri = config.mongoUri || 'mongodb://localhost:27017/polaris';
  await mongoose.connect(mongoUri, { dbName: 'polaris' });
  console.log('Connected to MongoDB');

  const admin = await User.findOne({ email: config.adminEmail?.toLowerCase() });
  if (!admin) {
    console.error('Admin user not found. Please run seedAdmin first.');
    process.exit(1);
  }

  const sampleRecords = [
    {
      title: 'Pine Island Glacier Cavity Thermal Flux & Basal Ice Dynamics 2026',
      description: 'Comprehensive oceanographic and glaciological survey measuring sub-ice shelf oceanic heat transport and basal melting rates beneath Pine Island Glacier grounding zone.',
      type: ContentType.REPORT,
      scientist: admin._id,
      scientistName: 'Dr. Elena Rostova',
      institution: 'British Antarctic Survey',
      region: 'West Antarctica',
      expedition: 'International Thwaites & Pine Island Expedition 2026',
      year: 2026,
      researchTopic: 'Glaciology & Cryospheric Mass Balance',
      keywords: ['glaciology', 'pine island', 'grounding line', 'basal melting', 'ice shelf'],
      fileUrl: 'https://res.cloudinary.com/b5raj7s4/image/upload/v1788542348/polaris/reports/outreach_thwaites_report.pdf',
      status: ContentStatus.PUBLISHED,
    },
    {
      title: 'Antarctic Ozone Hole Recovery Dynamics & Stratospheric Vortex Chemistry',
      description: 'Long-term peer-reviewed observational analysis of total column ozone, chlorofluorocarbon decay trajectories, and polar stratospheric cloud formation over Maitri Station.',
      type: ContentType.PUBLICATION,
      scientist: admin._id,
      scientistName: 'Dr. Rajesh Sharma',
      institution: 'National Centre for Polar and Ocean Research (NCPOR)',
      region: 'East Antarctica / Queen Maud Land',
      expedition: '43rd Indian Scientific Expedition to Antarctica',
      year: 2025,
      researchTopic: 'Atmospheric Sciences & Ozone Physics',
      keywords: ['ozone layer', 'stratosphere', 'maitri station', 'atmospheric chemistry', 'polar vortex'],
      fileUrl: 'https://res.cloudinary.com/b5raj7s4/image/upload/v1788542348/polaris/reports/outreach_thwaites_report.pdf',
      externalUrl: 'https://doi.org/10.1016/j.atmosres.2025.107890',
      status: ContentStatus.PUBLISHED,
    },
    {
      title: 'High-Resolution CryoSat-3 Satellite Altimetry Matrix 2026',
      description: 'Calibrated radar altimetry datasets documenting elevation anomalies across Amundsen Sea Embayment and Wilkes Land ice drainage basins.',
      type: ContentType.DATASET,
      scientist: admin._id,
      scientistName: 'Dr. Krishna Bhadane',
      institution: 'Polaris Geodetic Laboratory',
      region: 'Antarctic Ice Sheet',
      expedition: 'Operation Polar Sentinel 2026',
      year: 2026,
      researchTopic: 'Satellite Geodesy & Remote Sensing',
      keywords: ['satellite altimetry', 'cryosat', 'ice elevation', 'geodesy', 'antarctica'],
      externalUrl: 'https://doi.org/10.1594/PANGAEA.942100',
      status: ContentStatus.PUBLISHED,
    },
    {
      title: 'Sentinel-2 Multispectral Capture of Larsen C Rifting Progression',
      description: 'Calibrated true-color and thermal band imagery capturing structural fracture propagation along the northern edge of the Larsen C Ice Shelf.',
      type: ContentType.IMAGE,
      scientist: admin._id,
      scientistName: 'Dr. Sarah Lindqvist',
      institution: 'Norwegian Polar Institute',
      region: 'Antarctic Peninsula',
      expedition: 'Arctic-Antarctic Remote Sensing Taskforce',
      year: 2026,
      researchTopic: 'Remote Sensing & Glacial Fractures',
      keywords: ['larsen c', 'ice rifting', 'sentinel-2', 'satellite imagery', 'antarctic peninsula'],
      fileUrl: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1600&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=600&q=80',
      status: ContentStatus.PUBLISHED,
    },
    {
      title: 'Autonomous Underwater Vehicle (AUV) Deployment Beneath Thwaites Ice Tongue',
      description: 'Field telemetry and 4K optical footage of robotic sub-ice exploration investigating ocean cavity turbulence and benthic sediment cores.',
      type: ContentType.VIDEO,
      scientist: admin._id,
      scientistName: 'Dr. Marcus Thorne',
      institution: 'Woods Hole Oceanographic Institution',
      region: 'West Antarctica / Amundsen Sea',
      expedition: 'Sub-Ice Robotics Campaign 2026',
      year: 2026,
      researchTopic: 'Oceanography & Sub-Ice Robotics',
      keywords: ['auv robotics', 'thwaites', 'underwater footage', 'ocean turbulence', 'sub-ice cavity'],
      fileUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      externalUrl: 'https://www.youtube.com/watch?v=sample-polar-auv',
      status: ContentStatus.PUBLISHED,
    },
    {
      title: 'Bharati Station Atmospheric Aerosol & Solar Radiation Profiling Campaign',
      description: 'Continuous 90-day polar field observation tracking black carbon concentrations, radiative forcing, and aerosol optical depth during austral summer.',
      type: ContentType.ACTIVITY,
      scientist: admin._id,
      scientistName: 'Dr. Priya Sundaram',
      institution: 'Indian Institute of Tropical Meteorology',
      region: 'East Antarctica / Larsemann Hills',
      expedition: '44th Indian Antarctic Expedition',
      year: 2026,
      researchTopic: 'Atmospheric Physics & Radiation Balance',
      keywords: ['bharati station', 'larsemann hills', 'aerosols', 'solar radiation', 'field campaign'],
      status: ContentStatus.PUBLISHED,
    },
  ];

  for (const record of sampleRecords) {
    const existing = await Content.findOne({ title: record.title });
    if (!existing) {
      await Content.create(record);
      console.log(`Created sample content: [${record.type}] ${record.title}`);
    } else {
      console.log(`Already exists: [${record.type}] ${record.title}`);
    }
  }

  await mongoose.disconnect();
  console.log('Seeding complete.');
  process.exit(0);
};

seedDiverseContent().catch((err) => {
  console.error(err);
  process.exit(1);
});
