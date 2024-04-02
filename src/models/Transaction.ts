interface Transaction {
  id?: number;
  ticketcode: string;
  keycode?: string;
  trans_data?: string;
  betdate: string;
  betdraw: number;
  bettime: string;
  bettypeid: number;
  trans_no: number;
  total: number;
  status: string;
  created_at: string;
}

export default Transaction;
