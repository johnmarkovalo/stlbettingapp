import Bet from './Bet';

interface Transaction {
  id?: number;
  ticketcode: string;
  keycode?: string;
  trans_data: string;
  betdate: string;
  bettime: number;
  bettypeid: number;
  trans_no: number;
  total: number;
  status: string;
  created_at?: string;
  bets?: Bet[];
}

export default Transaction;
