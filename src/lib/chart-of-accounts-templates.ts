// Kazakhstan Chart of Accounts Templates
// Based on NSFO (National Standards of Financial Reporting) and IFRS

export type AccountClass = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface AccountTemplate {
  code: string;
  name: string;
  name_kz: string;
  account_class: AccountClass;
  is_system: boolean;
  allow_manual_entry: boolean;
  children?: AccountTemplate[];
}

// NSFO - National Standards (Национальные стандарты финансовой отчётности)
// For small and medium businesses in Kazakhstan
export const NSFO_TEMPLATE: AccountTemplate[] = [
  // РАЗДЕЛ 1 - КРАТКОСРОЧНЫЕ АКТИВЫ (1000-1999)
  {
    code: '1000',
    name: 'Краткосрочные активы',
    name_kz: 'Қысқа мерзімді активтер',
    account_class: 'asset',
    is_system: true,
    allow_manual_entry: false,
    children: [
      {
        code: '1010',
        name: 'Денежные средства в кассе',
        name_kz: 'Кассадағы ақша қаражаттары',
        account_class: 'asset',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '1020',
        name: 'Денежные средства в пути',
        name_kz: 'Жолдағы ақша қаражаттары',
        account_class: 'asset',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '1030',
        name: 'Денежные средства на текущих счетах',
        name_kz: 'Ағымдағы шоттардағы ақша қаражаттары',
        account_class: 'asset',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '1040',
        name: 'Денежные средства на карт-счетах',
        name_kz: 'Карт-шоттардағы ақша қаражаттары',
        account_class: 'asset',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '1050',
        name: 'Денежные средства на сберегательных счетах',
        name_kz: 'Жинақ шоттарындағы ақша қаражаттары',
        account_class: 'asset',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '1210',
        name: 'Краткосрочная дебиторская задолженность покупателей',
        name_kz: 'Сатып алушылардың қысқа мерзімді дебиторлық берешегі',
        account_class: 'asset',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '1250',
        name: 'Краткосрочная дебиторская задолженность работников',
        name_kz: 'Жұмысшылардың қысқа мерзімді дебиторлық берешегі',
        account_class: 'asset',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '1280',
        name: 'Прочая краткосрочная дебиторская задолженность',
        name_kz: 'Өзге қысқа мерзімді дебиторлық берешек',
        account_class: 'asset',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '1310',
        name: 'Сырьё и материалы',
        name_kz: 'Шикізат және материалдар',
        account_class: 'asset',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '1320',
        name: 'Готовая продукция',
        name_kz: 'Дайын өнім',
        account_class: 'asset',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '1330',
        name: 'Товары',
        name_kz: 'Тауарлар',
        account_class: 'asset',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '1420',
        name: 'НДС к возмещению',
        name_kz: 'Өтелуге жататын ҚҚС',
        account_class: 'asset',
        is_system: true,
        allow_manual_entry: true,
      },
    ],
  },
  // РАЗДЕЛ 2 - ДОЛГОСРОЧНЫЕ АКТИВЫ (2000-2999)
  {
    code: '2000',
    name: 'Долгосрочные активы',
    name_kz: 'Ұзақ мерзімді активтер',
    account_class: 'asset',
    is_system: true,
    allow_manual_entry: false,
    children: [
      {
        code: '2410',
        name: 'Основные средства',
        name_kz: 'Негізгі құралдар',
        account_class: 'asset',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '2420',
        name: 'Амортизация основных средств',
        name_kz: 'Негізгі құралдардың амортизациясы',
        account_class: 'asset',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '2730',
        name: 'Нематериальные активы',
        name_kz: 'Материалдық емес активтер',
        account_class: 'asset',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '2740',
        name: 'Амортизация нематериальных активов',
        name_kz: 'Материалдық емес активтердің амортизациясы',
        account_class: 'asset',
        is_system: true,
        allow_manual_entry: true,
      },
    ],
  },
  // РАЗДЕЛ 3 - КРАТКОСРОЧНЫЕ ОБЯЗАТЕЛЬСТВА (3000-3999)
  {
    code: '3000',
    name: 'Краткосрочные обязательства',
    name_kz: 'Қысқа мерзімді міндеттемелер',
    account_class: 'liability',
    is_system: true,
    allow_manual_entry: false,
    children: [
      {
        code: '3010',
        name: 'Краткосрочные банковские займы',
        name_kz: 'Қысқа мерзімді банктік қарыздар',
        account_class: 'liability',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '3310',
        name: 'Краткосрочная кредиторская задолженность поставщикам',
        name_kz: 'Жеткізушілерге қысқа мерзімді кредиторлық берешек',
        account_class: 'liability',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '3350',
        name: 'Краткосрочная задолженность по оплате труда',
        name_kz: 'Еңбекақы төлеу бойынша қысқа мерзімді берешек',
        account_class: 'liability',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '3360',
        name: 'Краткосрочные отчисления в пенсионный фонд',
        name_kz: 'Зейнетақы қорына қысқа мерзімді аударымдар',
        account_class: 'liability',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '3370',
        name: 'Краткосрочные отчисления в фонд социального страхования',
        name_kz: 'Әлеуметтік сақтандыру қорына қысқа мерзімді аударымдар',
        account_class: 'liability',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '3380',
        name: 'Краткосрочные отчисления ОСМС',
        name_kz: 'МӘМС қысқа мерзімді аударымдары',
        account_class: 'liability',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '3110',
        name: 'Корпоративный подоходный налог к уплате',
        name_kz: 'Төленуге жататын корпоративтік табыс салығы',
        account_class: 'liability',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '3120',
        name: 'ИПН к уплате',
        name_kz: 'Төленуге жататын ЖТС',
        account_class: 'liability',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '3130',
        name: 'НДС к уплате',
        name_kz: 'Төленуге жататын ҚҚС',
        account_class: 'liability',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '3140',
        name: 'Социальный налог к уплате',
        name_kz: 'Төленуге жататын әлеуметтік салық',
        account_class: 'liability',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '3390',
        name: 'Прочая краткосрочная кредиторская задолженность',
        name_kz: 'Өзге қысқа мерзімді кредиторлық берешек',
        account_class: 'liability',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '3520',
        name: 'Доходы будущих периодов',
        name_kz: 'Болашақ кезең табыстары',
        account_class: 'liability',
        is_system: true,
        allow_manual_entry: true,
      },
    ],
  },
  // РАЗДЕЛ 4 - ДОЛГОСРОЧНЫЕ ОБЯЗАТЕЛЬСТВА (4000-4999)
  {
    code: '4000',
    name: 'Долгосрочные обязательства',
    name_kz: 'Ұзақ мерзімді міндеттемелер',
    account_class: 'liability',
    is_system: true,
    allow_manual_entry: false,
    children: [
      {
        code: '4010',
        name: 'Долгосрочные банковские займы',
        name_kz: 'Ұзақ мерзімді банктік қарыздар',
        account_class: 'liability',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '4030',
        name: 'Долгосрочные займы от нефинансовых организаций',
        name_kz: 'Қаржы емес ұйымдардан алынған ұзақ мерзімді қарыздар',
        account_class: 'liability',
        is_system: true,
        allow_manual_entry: true,
      },
    ],
  },
  // РАЗДЕЛ 5 - КАПИТАЛ (5000-5999)
  {
    code: '5000',
    name: 'Капитал',
    name_kz: 'Капитал',
    account_class: 'equity',
    is_system: true,
    allow_manual_entry: false,
    children: [
      {
        code: '5010',
        name: 'Уставный капитал',
        name_kz: 'Жарғылық капитал',
        account_class: 'equity',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '5020',
        name: 'Неоплаченный капитал',
        name_kz: 'Төленбеген капитал',
        account_class: 'equity',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '5030',
        name: 'Изъятый капитал',
        name_kz: 'Алынып тасталған капитал',
        account_class: 'equity',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '5410',
        name: 'Резервный капитал',
        name_kz: 'Резервтік капитал',
        account_class: 'equity',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '5510',
        name: 'Нераспределённая прибыль (непокрытый убыток)',
        name_kz: 'Бөлінбеген пайда (жабылмаған залал)',
        account_class: 'equity',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '5520',
        name: 'Итоговый доход (убыток)',
        name_kz: 'Қорытынды кіріс (шығын)',
        account_class: 'equity',
        is_system: true,
        allow_manual_entry: true,
      },
    ],
  },
  // РАЗДЕЛ 6 - ДОХОДЫ (6000-6999)
  {
    code: '6000',
    name: 'Доходы',
    name_kz: 'Кірістер',
    account_class: 'revenue',
    is_system: true,
    allow_manual_entry: false,
    children: [
      {
        code: '6010',
        name: 'Доход от реализации продукции',
        name_kz: 'Өнімді сатудан түскен кіріс',
        account_class: 'revenue',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '6020',
        name: 'Доход от оказания услуг',
        name_kz: 'Қызмет көрсетуден түскен кіріс',
        account_class: 'revenue',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '6030',
        name: 'Доход от реализации товаров',
        name_kz: 'Тауарларды сатудан түскен кіріс',
        account_class: 'revenue',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '6110',
        name: 'Доходы по вознаграждениям',
        name_kz: 'Сыйақылар бойынша кірістер',
        account_class: 'revenue',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '6210',
        name: 'Доходы от выбытия активов',
        name_kz: 'Активтерді шығарудан түскен кірістер',
        account_class: 'revenue',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '6280',
        name: 'Прочие доходы',
        name_kz: 'Өзге кірістер',
        account_class: 'revenue',
        is_system: true,
        allow_manual_entry: true,
      },
    ],
  },
  // РАЗДЕЛ 7 - РАСХОДЫ (7000-7999)
  {
    code: '7000',
    name: 'Расходы',
    name_kz: 'Шығыстар',
    account_class: 'expense',
    is_system: true,
    allow_manual_entry: false,
    children: [
      {
        code: '7010',
        name: 'Себестоимость реализованной продукции',
        name_kz: 'Сатылған өнімнің өзіндік құны',
        account_class: 'expense',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '7020',
        name: 'Себестоимость оказанных услуг',
        name_kz: 'Көрсетілген қызметтердің өзіндік құны',
        account_class: 'expense',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '7030',
        name: 'Себестоимость реализованных товаров',
        name_kz: 'Сатылған тауарлардың өзіндік құны',
        account_class: 'expense',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '7110',
        name: 'Расходы по реализации продукции и услуг',
        name_kz: 'Өнім мен қызметтерді сату бойынша шығыстар',
        account_class: 'expense',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '7210',
        name: 'Административные расходы',
        name_kz: 'Әкімшілік шығыстар',
        account_class: 'expense',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '7310',
        name: 'Расходы по вознаграждениям',
        name_kz: 'Сыйақылар бойынша шығыстар',
        account_class: 'expense',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '7410',
        name: 'Расходы от выбытия активов',
        name_kz: 'Активтерді шығарудан болған шығыстар',
        account_class: 'expense',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '7470',
        name: 'Прочие расходы',
        name_kz: 'Өзге шығыстар',
        account_class: 'expense',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '7710',
        name: 'Расходы по корпоративному подоходному налогу',
        name_kz: 'Корпоративтік табыс салығы бойынша шығыстар',
        account_class: 'expense',
        is_system: true,
        allow_manual_entry: true,
      },
    ],
  },
  // РАЗДЕЛ 8 - СЧЕТА ПРОИЗВОДСТВЕННОГО УЧЁТА (8000-8999)
  {
    code: '8000',
    name: 'Счета производственного учёта',
    name_kz: 'Өндірістік есептің шоттары',
    account_class: 'expense',
    is_system: true,
    allow_manual_entry: false,
    children: [
      {
        code: '8010',
        name: 'Основное производство',
        name_kz: 'Негізгі өндіріс',
        account_class: 'expense',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '8030',
        name: 'Вспомогательные производства',
        name_kz: 'Қосалқы өндірістер',
        account_class: 'expense',
        is_system: true,
        allow_manual_entry: true,
      },
      {
        code: '8040',
        name: 'Накладные расходы',
        name_kz: 'Үстеме шығыстар',
        account_class: 'expense',
        is_system: true,
        allow_manual_entry: true,
      },
    ],
  },
];

// IFRS/МСФО template is similar but with some structural differences
// For MVP, we'll use the NSFO structure as base and mark the standard
export const IFRS_TEMPLATE: AccountTemplate[] = NSFO_TEMPLATE;

export function flattenAccounts(
  accounts: AccountTemplate[],
  parentId: string | null = null
): Array<Omit<AccountTemplate, 'children'> & { parent_code: string | null }> {
  const result: Array<Omit<AccountTemplate, 'children'> & { parent_code: string | null }> = [];

  for (const account of accounts) {
    const { children, ...rest } = account;
    result.push({ ...rest, parent_code: parentId });

    if (children && children.length > 0) {
      result.push(...flattenAccounts(children, account.code));
    }
  }

  return result;
}

export function getAccountsByClass(accounts: AccountTemplate[], accountClass: AccountClass): AccountTemplate[] {
  const result: AccountTemplate[] = [];

  for (const account of accounts) {
    if (account.account_class === accountClass) {
      result.push(account);
    }
    if (account.children) {
      result.push(...getAccountsByClass(account.children, accountClass));
    }
  }

  return result;
}
