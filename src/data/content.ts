export type ContentTopic = {
  title: string;
  eyebrow: string;
  paragraphs: string[];
};

export const contentTopics: Record<string, ContentTopic> = {
  'O que é Pedejá': {
    title: 'O que é Pedejá',
    eyebrow: 'SOBRE',
    paragraphs: [
      'Pedejá é a plataforma angolana de entrega e envio. Comida, compras do dia a dia, supermercados e encomendas — tudo o que precisas, a mover-se contigo.',
      'Nascido para responder às necessidades de Luanda e de toda a Angola, o Pedejá organiza no mesmo lugar o que está perto de ti e leva-te o que pedires, com estafetas e parceiros locais.',
      'A nossa promessa é simples: "A promessa que se move". Pedes, nós levamos.',
    ],
  },
  'A promessa que se move': {
    title: 'A promessa que se move',
    eyebrow: 'SOBRE',
    paragraphs: [
      'Uma promessa só vale quando chega. É por isso que tudo no Pedejá — desde o primeiro clique até à entrega — trabalha para cumprir o que prometemos.',
      'Estafetas, restaurantes, comerciantes e lojas: todos unidos por um compromisso de chegar a tempo, em ordem e com respeito pelo teu tempo.',
    ],
  },
  'Como pedir': {
    title: 'Como pedir',
    eyebrow: 'COMO FUNCIONA',
    paragraphs: [
      'Escolhe o que precisas em Início ou explorando Comida, Compras e Lojas. Adiciona os itens ao cesto, confirma o teu endereço de entrega e escolhe a forma de pagamento.',
      'Assim que fizeres o pedido, acompanhas tudo em tempo real em Pedidos: o negócio a preparar, o estafeta a caminho de ti e o momento da entrega.',
    ],
  },
  'Como enviar': {
    title: 'Como enviar',
    eyebrow: 'COMO FUNCIONA',
    paragraphs: [
      'Na opção Enviar, indicas a origem e o destino, o que envias e o tamanho da encomenda. Nós calculamos a distância, o tempo e o preço com as condições da viagem em conta.',
      'Escolhes o veículo recomendado, confirmas e acompanhas o teu envio como um pedido normal. A verificação fotográfica ajuda a garantir que tudo chega como enviaste.',
    ],
  },
  'Acompanhar pedido': {
    title: 'Acompanhar pedido',
    eyebrow: 'COMO FUNCIONA',
    paragraphs: [
      'Em Pedidos encontras tudo o que está ativo: quem está a preparar, quem leva e onde está o teu pedido em cada momento.',
      'Podes ligar ou escrever ao estafeta, partilhar o pedido e falar connosco pelo WhatsApp se precisares de ajuda.',
    ],
  },
  Restaurantes: {
    title: 'Restaurantes',
    eyebrow: 'NEGÓCIOS',
    paragraphs: [
      'Dos pratos de sempre aos novos sabores: o Pedejá liga-te aos restaurantes e cozinhas locais, do teu bairro aos grandes nomes da cidade.',
      'Se tens um restaurante, junta-te à rede e leva o teu menu aos clientes de toda a cidade, com apoio de gestão de pedidos e relatórios.',
    ],
  },
  Comerciantes: {
    title: 'Comerciantes',
    eyebrow: 'NEGÓCIOS',
    paragraphs: [
      'Farmácias, mercearias e comércio local de confiança: o Pedejá aproxima os pequenos comerciantes de quem mais precisa deles.',
      'Regista o teu comércio, gere o teu catálogo e recebe pedidos de toda a zona, com entrega garantida pela nossa rede.',
    ],
  },
  Lojas: {
    title: 'Lojas',
    eyebrow: 'NEGÓCIOS',
    paragraphs: [
      'Supermercados, malls e grandes retalhistas encontram no Pedejá a escala da cidade com a proximidade de bairro.',
      'Do catálogo à entrega, tudo integrado para que os teus clientes comprem em casa e recebam à porta.',
    ],
  },
  'Tornar-se Estafeta': {
    title: 'Tornar-se Estafeta',
    eyebrow: 'TORNA-TE PARTE DA REDE',
    paragraphs: [
      'Entregas e ganhas com o Pedejá, com a tua própria mota, carro ou van. Escolhes quando estar online e recebes a cada entrega.',
      'Cada corrida mostra a origem, o destino, a distância e o valor antes de aceitares. Aceitas, recolhes, entregas — e ganhas.',
      'As tuas ganancias mostram-se de forma transparente: valor base, distância, espera, picos, gorjeta e total.',
    ],
  },
  'Tornar-se Parceiro': {
    title: 'Tornar-se Parceiro',
    eyebrow: 'TORNA-TE PARTE DA REDE',
    paragraphs: [
      'Se tens uma frota, uma comunidade ou um negócio de entregas, o Pedejá oferece parcerias que multiplicam a tua capacidade.',
      'Fala connosco para conheceres os modelos de parceria disponíveis e crescer com a nossa rede.',
    ],
  },
  'Registar negócio': {
    title: 'Registar negócio',
    eyebrow: 'TORNA-TE PARTE DA REDE',
    paragraphs: [
      'Restaurantes, comerciantes e lojas: podes registar o teu negócio e começar a receber pedidos em dias.',
      'Precisas de documentação básica (registo do negócio e licenças) e da tua localização. A nossa equipa acompanha cada passo.',
    ],
  },
  FAQ: {
    title: 'Perguntas frequentes',
    eyebrow: 'SUPORTE',
    paragraphs: [
      'Como é que o pagamento funciona? Podes pagar em dinheiro ao estafeta ou com Multicaixa. Nós avisamos-te sempre antes.',
      'Posso mudar o meu endereço de entrega? Sim. Escolhes o teu lugar em Início, e podes manter vários endereços no teu Perfil.',
      'O que acontece se o pedido atrasar? Acompanha em tempo real e fala connosco pelo WhatsApp. Resolvemos rápido.',
    ],
  },
  Ajuda: {
    title: 'Ajuda',
    eyebrow: 'SUPORTE',
    paragraphs: [
      'Precisas de ajuda com um pedido, pagamento, estafeta ou conta? Explica o que aconteceu conosco pelo WhatsApp e respondemos o quanto antes.',
      'Guarda o número do teu pedido para agilizar o atendimento.',
    ],
  },
  'Política de Privacidade': {
    title: 'Política de Privacidade',
    eyebrow: 'LEGAL',
    paragraphs: [
      'A tua privacidade é levada a sério. Recolhemos apenas o necessário para fazer funcionar o Pedejá: conta, endereços, entregas e suporte.',
      'A tua localização é usada para entregar e só enquanto precisamos dela. Nunca vendemos os teus dados.',
      'As fotos de encomendas servem para prevenir disputas e são eliminadas ao fim de um período, de acordo com a nossa política de retenção.',
    ],
  },
  'Termos de Uso': {
    title: 'Termos de Uso',
    eyebrow: 'LEGAL',
    paragraphs: [
      'Ao usar o Pedejá aceitas que os preços, tempos e disponibilidade possam variar com a procura, o trânsito e as condições da estrada.',
      'O Pedejá liga clientes, negócios e estafetas e não é responsável pelo conteúdo dos produtos ou serviços vendidos pelos parceiros.',
      'O uso da plataforma assume o compromisso de um comportamento correto entre clientes, estafetas e negócios.',
    ],
  },
  Responsabilidade: {
    title: 'Responsabilidade',
    eyebrow: 'LEGAL',
    paragraphs: [
      'Tratamos cada encomenda com cuidado: embalagem, verificação fotográfica e entrega com confirmação.',
      'Em caso de extravio ou dano, cada caso é analisado com base na evidência recolhida durante o processo de entrega.',
      'Contacta-nos pelo WhatsApp com o número do pedido e a descrição do problema.',
    ],
  },
  Reembolsos: {
    title: 'Política de Reembolsos',
    eyebrow: 'LEGAL',
    paragraphs: [
      'Se o teu pedido não chegou ou chegou incorreto, pedimos desculpa e tratamos de corrigir rapidamente.',
      'Reembolsos são processados após análise do pedido e das evidências da entrega.',
      'Podes pedir reembolso no suporte, indicando o número do pedido e o que aconteceu.',
    ],
  },
};

export const defaultTopic: ContentTopic = {
  title: 'Em breve',
  eyebrow: 'PEDEJÁ',
  paragraphs: [
    'Estamos a preparar este conteúdo para ti. Volta em breve ou fala connosco pelo WhatsApp.',
  ],
};