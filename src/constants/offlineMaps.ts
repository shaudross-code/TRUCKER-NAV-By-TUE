export interface MapRegion {
  name: string;
  size: string;
  downloaded?: boolean;
}

export interface MapCountry {
  name: string;
  size: string;
  states?: MapRegion[];
  downloaded?: boolean;
}

export interface MapContinent {
  name: string;
  countries: MapCountry[];
}

export const offlineMapsData: MapContinent[] = [
  {
    name: 'North America',
    countries: [
      {
        name: 'United States',
        size: '15 GB',
        states: [
          { name: 'Alabama', size: '600 MB' }, { name: 'Alaska', size: '1.1 GB' }, { name: 'Arizona', size: '800 MB' },
          { name: 'Arkansas', size: '550 MB' }, { name: 'California', size: '1.2 GB' }, { name: 'Colorado', size: '750 MB' },
          { name: 'Connecticut', size: '400 MB' }, { name: 'Delaware', size: '300 MB' }, { name: 'Florida', size: '920 MB' },
          { name: 'Georgia', size: '840 MB' }, { name: 'Hawaii', size: '500 MB' }, { name: 'Idaho', size: '650 MB' },
          { name: 'Illinois', size: '780 MB' }, { name: 'Indiana', size: '600 MB' }, { name: 'Iowa', size: '550 MB' },
          { name: 'Kansas', size: '600 MB' }, { name: 'Kentucky', size: '550 MB' }, { name: 'Louisiana', size: '550 MB' },
          { name: 'Maine', size: '500 MB' }, { name: 'Maryland', size: '500 MB' }, { name: 'Massachusetts', size: '550 MB' },
          { name: 'Michigan', size: '720 MB' }, { name: 'Minnesota', size: '700 MB' }, { name: 'Mississippi', size: '500 MB' },
          { name: 'Missouri', size: '650 MB' }, { name: 'Montana', size: '800 MB' }, { name: 'Nebraska', size: '550 MB' },
          { name: 'Nevada', size: '700 MB' }, { name: 'New Hampshire', size: '400 MB' }, { name: 'New Jersey', size: '500 MB' },
          { name: 'New Mexico', size: '700 MB' }, { name: 'New York', size: '850 MB' }, { name: 'North Carolina', size: '790 MB' },
          { name: 'North Dakota', size: '500 MB' }, { name: 'Ohio', size: '750 MB' }, { name: 'Oklahoma', size: '600 MB' },
          { name: 'Oregon', size: '750 MB' }, { name: 'Pennsylvania', size: '810 MB' }, { name: 'Rhode Island', size: '300 MB' },
          { name: 'South Carolina', size: '550 MB' }, { name: 'South Dakota', size: '500 MB' }, { name: 'Tennessee', size: '650 MB' },
          { name: 'Texas', size: '1.5 GB' }, { name: 'Utah', size: '700 MB' }, { name: 'Vermont', size: '400 MB' },
          { name: 'Virginia', size: '650 MB' }, { name: 'Washington', size: '800 MB' }, { name: 'West Virginia', size: '500 MB' },
          { name: 'Wisconsin', size: '650 MB' }, { name: 'Wyoming', size: '600 MB' }
        ]
      },
      { name: 'Canada', size: '4.2 GB' },
      { name: 'Mexico', size: '3.8 GB' },
    ]
  },
  {
    name: 'South America',
    countries: [
      { name: 'Brazil', size: '2.5 GB' },
      { name: 'Argentina', size: '1.8 GB' },
    ]
  },
  {
    name: 'Europe',
    countries: [
      { name: 'Germany', size: '2.1 GB' },
      { name: 'France', size: '1.9 GB' },
    ]
  },
  {
    name: 'Asia',
    countries: [
      { name: 'Japan', size: '2.3 GB' },
      { name: 'India', size: '3.1 GB' },
    ]
  }
];
