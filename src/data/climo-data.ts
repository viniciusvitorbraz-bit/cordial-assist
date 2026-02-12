export const hourlyVolumeData = [
  { hour: '08h', volume: 12 },
  { hour: '09h', volume: 45 },
  { hour: '10h', volume: 58 },
  { hour: '11h', volume: 35 },
  { hour: '12h', volume: 20 },
  { hour: '13h', volume: 25 },
  { hour: '14h', volume: 48 },
  { hour: '15h', volume: 52 },
  { hour: '16h', volume: 40 },
  { hour: '17h', volume: 15 },
  { hour: '18h', volume: 8 },
];

export const resolutionData = [
  { name: 'Resolvido pela IA', value: 72, color: 'hsl(200, 70%, 50%)' },
  { name: 'Transbordo Humano', value: 28, color: 'hsl(235, 70%, 25%)' },
];

export interface Lead {
  id: number;
  name: string;
  company: string;
  status: string;
  time: string;
  value: string;
  intent: string;
}

export const leadsData: Lead[] = [
  { id: 1, name: 'Marcos Souza', company: 'TechSoluções', status: 'Agendado', time: '10 min', value: 'R$ 80,00', intent: 'Exame Admissional' },
  { id: 2, name: 'RH Construtora ABC', company: 'Construtora ABC', status: 'Interesse', time: '32 min', value: 'R$ 1.500,00', intent: 'Orçamento PCMSO' },
  { id: 3, name: 'Julia Lima', company: 'Varejo Express', status: 'Atenção', time: '1h', value: '-', intent: 'Erro no ASO' },
  { id: 4, name: 'Roberto Dias', company: 'Logística Veloz', status: 'Agendado', time: '2h', value: 'R$ 120,00', intent: 'Mudança de Função' },
  { id: 5, name: 'Pedro Alves', company: 'Autônomo', status: 'Pendente', time: '3h', value: 'R$ 80,00', intent: 'Admissional' },
];

export interface ChatContact {
  id: number;
  name: string;
  company: string;
  lastMsg: string;
  time: string;
  status: 'bot' | 'human';
  unread: number;
}

export const activeChats: ChatContact[] = [
  { id: 101, name: 'Carla Dias (RH)', company: 'Logística Brasil', lastMsg: 'Preciso agendar 5 admissionais para amanhã.', time: '10:42', status: 'bot', unread: 2 },
  { id: 102, name: 'João Pedro', company: 'Autônomo', lastMsg: 'Qual o valor do ASO avulso?', time: '10:15', status: 'bot', unread: 0 },
  { id: 103, name: 'Amanda Souza', company: 'Mercado Feliz', lastMsg: 'O funcionário não pode ir nesse horário.', time: '09:30', status: 'human', unread: 0 },
];

export const chatHistoryMock = [
  { sender: 'user', text: 'Bom dia, gostaria de agendar um exame admissional.', time: '09:00' },
  { sender: 'bot', text: 'Bom dia. Climo AI aqui. Para qual empresa seria o agendamento?', time: '09:00' },
  { sender: 'user', text: 'É para a Logística Brasil.', time: '09:01' },
  { sender: 'bot', text: 'Localizado. O exame é para função de risco ou administrativo?', time: '09:01' },
  { sender: 'user', text: 'É motorista de caminhão.', time: '09:02' },
  { sender: 'bot', text: 'Certo. Motorista requer toxicológico e audiometria. Temos horários amanhã às 08:30 ou 10:00.', time: '09:02' },
  { sender: 'user', text: 'Preciso agendar 5 admissionais para amanhã. Tem como ser todos juntos?', time: '09:05' },
];

export const kanbanColumns: Record<string, Lead[]> = {
  'Novos': leadsData.filter(l => l.status === 'Pendente' || l.status === 'Interesse'),
  'Em Atendimento': [],
  'Atenção Requerida': leadsData.filter(l => l.status === 'Atenção'),
  'Concluídos': leadsData.filter(l => l.status === 'Agendado'),
};
