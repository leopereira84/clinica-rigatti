import type { Role } from '../shared/auth/roles.js';

export interface DemoUser {
  name: string;
  email: string;
  role: Role;
}

export interface DemoProduct {
  name: string;
  description: string;
  price: number; // cents
  category: string;
  sku: string;
  stock: number;
  imageUrl?: string;
}

export interface DemoCompany {
  name: string;
  users: DemoUser[];
  products: DemoProduct[];
}

const image = (seed: string) => `https://picsum.photos/seed/${seed}/600/400`;

/**
 * Demo tenants. Emails use the reserved `.example` domain: they identify the
 * demo data, so re-running the seed only replaces these two companies.
 * Some product names overlap on purpose ("Banco", "Cadeira", "Luminária")
 * so tenant isolation is visible in search and in the AI chat.
 */
export const DEMO_COMPANIES: readonly DemoCompany[] = [
  {
    name: 'Aurora Móveis',
    users: [
      { name: 'Ana Aurora', email: 'admin@aurora-moveis.example', role: 'admin' },
      { name: 'Bruno Aurora', email: 'user@aurora-moveis.example', role: 'user' },
    ],
    products: [
      { name: 'Sofá Retrátil 3 Lugares', description: 'Sofá retrátil e reclinável em suede, 2,10 m de largura.', price: 349_990, category: 'Sala', sku: 'AUR-SOFA-001', stock: 8, imageUrl: image('aurora-sofa') },
      { name: 'Poltrona Decorativa Linho', description: 'Poltrona com estrutura em madeira e tecido de linho cru.', price: 129_900, category: 'Sala', sku: 'AUR-POLT-002', stock: 15, imageUrl: image('aurora-poltrona') },
      { name: 'Rack para TV 180 cm', description: 'Rack em MDF com nichos e portas de correr, para TVs até 75".', price: 89_990, category: 'Sala', sku: 'AUR-RACK-003', stock: 12, imageUrl: image('aurora-rack') },
      { name: 'Mesa de Jantar Madeira Maciça 6 Lugares', description: 'Mesa retangular em madeira de demolição, 1,80 m.', price: 459_000, category: 'Jantar', sku: 'AUR-MESA-004', stock: 4, imageUrl: image('aurora-mesa') },
      { name: 'Cadeira Estofada Veludo', description: 'Cadeira de jantar com assento e encosto em veludo verde.', price: 54_990, category: 'Jantar', sku: 'AUR-CAD-005', stock: 40, imageUrl: image('aurora-cadeira') },
      { name: 'Banco Estofado para Penteadeira', description: 'Banco baixo com assento estofado e pés palito.', price: 32_990, category: 'Quarto', sku: 'AUR-BANCO-006', stock: 0, imageUrl: image('aurora-banco') },
      { name: 'Cama Box Queen', description: 'Conjunto cama box queen com colchão de molas ensacadas.', price: 279_990, category: 'Quarto', sku: 'AUR-CAMA-007', stock: 6, imageUrl: image('aurora-cama') },
      { name: 'Guarda-Roupa 6 Portas', description: 'Guarda-roupa com 6 portas, 4 gavetas e espelho central.', price: 219_900, category: 'Quarto', sku: 'AUR-GR-008', stock: 3 },
      { name: 'Escrivaninha Home Office', description: 'Escrivaninha 1,20 m com gaveteiro e passa-cabos.', price: 69_990, category: 'Escritório', sku: 'AUR-ESC-009', stock: 20, imageUrl: image('aurora-escrivaninha') },
      { name: 'Cadeira Ergonômica Escritório', description: 'Cadeira com apoio lombar ajustável e braços 3D.', price: 119_990, category: 'Escritório', sku: 'AUR-CADESC-010', stock: 0, imageUrl: image('aurora-cadeira-escritorio') },
      { name: 'Luminária de Piso Arco', description: 'Luminária de piso em arco com cúpula metálica.', price: 45_990, category: 'Decoração', sku: 'AUR-LUM-011', stock: 9, imageUrl: image('aurora-luminaria') },
      { name: 'Tapete Sala 2 x 3 m', description: 'Tapete de fibra sintética, toque macio, tons neutros.', price: 79_900, category: 'Decoração', sku: 'AUR-TAP-012', stock: 11 },
    ],
  },
  {
    name: 'Verde Jardim',
    users: [
      { name: 'Carla Verde', email: 'admin@verde-jardim.example', role: 'admin' },
      { name: 'Diego Verde', email: 'user@verde-jardim.example', role: 'user' },
    ],
    products: [
      { name: 'Banco de Jardim em Madeira', description: 'Banco de eucalipto tratado para áreas externas, 1,50 m.', price: 89_900, category: 'Móveis de Jardim', sku: 'VJ-BANCO-001', stock: 7, imageUrl: image('verde-banco') },
      { name: 'Cadeira Dobrável Externa', description: 'Cadeira dobrável em alumínio com tela resistente ao sol.', price: 19_990, category: 'Móveis de Jardim', sku: 'VJ-CAD-002', stock: 35, imageUrl: image('verde-cadeira') },
      { name: 'Ombrelone 3 m', description: 'Ombrelone lateral com base, tecido com proteção UV.', price: 74_990, category: 'Móveis de Jardim', sku: 'VJ-OMB-003', stock: 5, imageUrl: image('verde-ombrelone') },
      { name: 'Vaso de Cerâmica Grande', description: 'Vaso esmaltado de 45 cm com furo para drenagem.', price: 15_990, category: 'Vasos', sku: 'VJ-VASO-004', stock: 22, imageUrl: image('verde-vaso') },
      { name: 'Jardineira Autoirrigável 60 cm', description: 'Jardineira plástica com reservatório de água.', price: 6_990, category: 'Vasos', sku: 'VJ-JARD-005', stock: 50 },
      { name: 'Kit Ferramentas de Jardinagem', description: 'Kit com pá, ancinho, garfo e tesoura de poda.', price: 12_990, category: 'Ferramentas', sku: 'VJ-KIT-006', stock: 18, imageUrl: image('verde-ferramentas') },
      { name: 'Mangueira Flexível 30 m', description: 'Mangueira com esguicho de 7 jatos e engates rápidos.', price: 14_990, category: 'Ferramentas', sku: 'VJ-MANG-007', stock: 0, imageUrl: image('verde-mangueira') },
      { name: 'Regador 10 L', description: 'Regador plástico com bico removível.', price: 4_990, category: 'Ferramentas', sku: 'VJ-REG-008', stock: 30 },
      { name: 'Terra Vegetal 25 kg', description: 'Terra vegetal adubada, pronta para plantio.', price: 2_990, category: 'Insumos', sku: 'VJ-TERRA-009', stock: 120, imageUrl: image('verde-terra') },
      { name: 'Adubo Orgânico 5 kg', description: 'Adubo de compostagem para hortas e jardins.', price: 3_990, category: 'Insumos', sku: 'VJ-ADUBO-010', stock: 80 },
      { name: 'Muda de Lavanda', description: 'Muda em pote 15 cm, ideal para sol pleno.', price: 2_490, category: 'Plantas', sku: 'VJ-LAV-011', stock: 45, imageUrl: image('verde-lavanda') },
      { name: 'Luminária Solar de Estaca (kit 6)', description: 'Kit com 6 luminárias solares de LED para caminhos.', price: 11_990, category: 'Iluminação', sku: 'VJ-LUM-012', stock: 0, imageUrl: image('verde-luminaria') },
    ],
  },
];
