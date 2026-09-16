import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { contactRepo, conversationRepo, messageRepo, dealRepo, meetingRepo, quotationRepo, proposalRepo, pipelineRepo, leadScoreRepo, syncRepo, aiRouterRepo, knowledgeRepo, memoryRepo, aiDataRepo } from '@/repositories';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;

  try {
    // 1. Fetch deals, payments, and invoices from Supabase
    const [dealsRes, paymentsRes, invoicesRes, contactsRes] = await Promise.all([
      supabase.from('deals').select('*').eq('user_id', userId),
      supabase.from('payments').select('*').eq('user_id', userId),
      supabase.from('invoices').select('*').eq('user_id', userId),
      supabase.from('contacts').select('id, name, company, industry, lead_source').eq('user_id', userId),
    ]);

    const deals = dealsRes.data || [];
    const payments = paymentsRes.data || [];
    const invoices = invoicesRes.data || [];
    const contacts = contactsRes.data || [];

    // 2. Fetch all predictions from MongoDB to compute CLV leaderboards
    let mongodbPredictions: any[] = [];
    try {
      const { db } = await connectToDatabase();
      mongodbPredictions = await db
        .collection('sales_predictions')
        .find({ user_id: userId })
        .toArray();
    } catch (mongoErr) {
      console.warn('[Revenue Analytics API] MongoDB predictions fetch failed:', mongoErr);
    }

    // 3. Aggregate Relational Sales Metrics
    let totalPipeline = 0;
    let expectedRevenue = 0;
    let wonRevenue = 0;
    let lostRevenue = 0;
    let wonCount = 0;
    let lostCount = 0;

    deals.forEach(d => {
      const val = Number(d.value) || 0;
      const prob = Number(d.probability) || 50;
      totalPipeline += val;

      if (d.status === 'won') {
        wonRevenue += val;
        wonCount++;
      } else if (d.status === 'lost' || d.status === 'cancelled') {
        lostRevenue += val;
        lostCount++;
      } else {
        expectedRevenue += val * (prob / 100);
      }
    });

    const totalClosed = wonCount + lostCount;
    const winRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;
    const avgDealValue = deals.length > 0 ? Math.round(totalPipeline / deals.length) : 0;

    // 4. Forecast Buckets (Monthly, Quarterly, Annual)
    const now = new Date();
    let monthlyForecast = 0;
    let quarterlyForecast = 0;
    let annualForecast = 0;

    deals.forEach(d => {
      if (d.status === 'won' || d.status === 'lost') return;
      
      const val = Number(d.value) || 0;
      const prob = Number(d.probability) || 50;
      const expectedVal = val * (prob / 100);
      
      const closingDate = d.closing_date ? new Date(d.closing_date) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // default 30 days out
      
      const monthsDiff = (closingDate.getFullYear() - now.getFullYear()) * 12 + (closingDate.getMonth() - now.getMonth());

      if (monthsDiff <= 0) {
        monthlyForecast += expectedVal;
      }
      if (monthsDiff <= 3) {
        quarterlyForecast += expectedVal;
      }
      if (monthsDiff <= 12) {
        annualForecast += expectedVal;
      }
    });

    // 5. Groupings (Service, Source, Employee)
    const serviceMap: Record<string, number> = {};
    const sourceMap: Record<string, number> = {};

    deals.forEach(d => {
      const val = Number(d.value) || 0;
      // Classify service categories
      let srv = 'Custom Web Solution';
      const titleLower = d.title?.toLowerCase() || '';
      if (titleLower.includes('e-commerce') || titleLower.includes('shop') || titleLower.includes('cart')) {
        srv = 'E-commerce Portal';
      } else if (titleLower.includes('crm') || titleLower.includes('whatsapp') || titleLower.includes('inbox')) {
        srv = 'Enterprise WhatsApp CRM';
      } else if (titleLower.includes('basic') || titleLower.includes('landing') || titleLower.includes('simple')) {
        srv = 'Basic Website';
      } else if (titleLower.includes('seo') || titleLower.includes('marketing')) {
        srv = 'SEO & Marketing';
      }
      serviceMap[srv] = (serviceMap[srv] || 0) + val;
    });

    contacts.forEach(c => {
      const src = c.lead_source || 'Direct';
      // Find deals for this contact to sum values
      const contactDeals = deals.filter(d => d.contact_id === c.id);
      const contactDealsVal = contactDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
      if (contactDealsVal > 0) {
        sourceMap[src] = (sourceMap[src] || 0) + contactDealsVal;
      }
    });

    const revenueByService = Object.entries(serviceMap).map(([name, value]) => ({ name, value }));
    const revenueBySource = Object.entries(sourceMap).map(([name, value]) => ({ name, value }));

    // 6. Compute Customer Lifetime Value (CLV) Leaderboard
    const clvLeaderboard = contacts.map(c => {
      // Find matching predictions in MongoDB
      const pred = mongodbPredictions.find(p => p.contact_id === c.id)?.predictions || {};

      const actualPaymentsSum = payments
        .filter(p => p.contact_id === c.id && p.status === 'completed')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // Predicted Lifetime value: use the ML prediction when we have one,
      // otherwise project from real payments. With neither, 0 â€” we don't
      // invent a number with no data behind it.
      const predictedClv = pred.clv?.estimatedValue || (actualPaymentsSum > 0 ? actualPaymentsSum * 1.5 : 0);
      const recurringRevenue = pred.clv?.recurringRevenue || (actualPaymentsSum > 0 ? Math.round(actualPaymentsSum * 0.1) : 0);
      const repeatProbability = pred.clv?.repeatPurchaseProbability || 0;

      return {
        id: c.id,
        contactName: c.name || 'Client',
        company: c.company || 'Their Business',
        industry: c.industry || 'IT Services',
        actualPaid: actualPaymentsSum,
        predictedClv: Math.max(predictedClv, actualPaymentsSum),
        recurringRevenue,
        repeatProbability,
      };
    }).sort((a, b) => b.predictedClv - a.predictedClv).slice(0, 10);

    return NextResponse.json({
      metrics: {
        totalPipeline,
        expectedRevenue,
        wonRevenue,
        lostRevenue,
        winRate,
        avgDealValue,
      },
      forecasts: {
        monthly: monthlyForecast,
        quarterly: quarterlyForecast,
        annual: annualForecast,
      },
      groupings: {
        revenueByService,
        revenueBySource,
      },
      clvLeaderboard,
    });
  } catch (err: any) {
    console.error('[Revenue Analytics API] fatal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
