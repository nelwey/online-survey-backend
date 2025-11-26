# Grafana Cloud Setup Guide - Step by Step

This guide will walk you through setting up monitoring with Grafana Cloud for your backend API on Render.

## Prerequisites

- ✅ Your backend is deployed on Render with the `/metrics` endpoint
- ✅ You have access to your Render service URL

---

## Step 1: Sign Up for Grafana Cloud

1. **Go to**: https://grafana.com/auth/sign-up/create-user
2. **Fill in**:
   - Email address
   - Password
   - Organization name (e.g., "My Survey App")
3. **Click**: "Sign up"
4. **Verify your email** if required
5. **You'll be redirected to** your Grafana Cloud dashboard

---

## Step 2: Get Your Prometheus Credentials

### Understanding the Options

When you go to add a connection in Grafana Cloud, you'll see two Prometheus options:

- **"Hosted Prometheus Metrics"** ← **Choose this one!**
  - This is Grafana Cloud's managed Prometheus service
  - You push metrics to it using `remote_write`
  - This is what we need for our setup

- **"Prometheus Data Source"** (skip this)
  - This is for connecting to an external Prometheus instance you manage yourself
  - We're not using this option

### Get Your Credentials

1. **In Grafana Cloud**, click on **"Connections"** in the left sidebar (or go to https://grafana.com/orgs/your-org/connections)
2. **Click**: **"Add new connection"** or **"Data sources"**
3. **Click on**: **"Hosted Prometheus Metrics"** (NOT "Prometheus Data Source")
4. **You'll see a page** asking: **"Choose a method for forwarding metrics"**
   - **Option 1**: "via grafana alloy" - Skip this (we're not using Alloy)
   - **Option 2**: "from my local prometheus server" ← **Choose this one!**
5. **Click**: **"from my local prometheus server"**
6. **Next, choose your use case**:
   - **"send metrics from a single prometheus instance"** ← **Choose this one!**
   - (The other options are for more complex setups - skip them)
7. **Next, configure remote_write**:
   - **Option 1**: "Directly (remote write metrics directly from prometheus to grafana cloud)" - This is what we want
   - **Option 2**: "Update prometheus configuration" - This shows you the config (we'll use this)
   - **Click**: **"Update prometheus configuration"** to see the credentials
8. **For the token/password**:
   - Grafana Cloud will offer to **generate an Access Policy token automatically** - **Use this!**
   - Click **"Click below to generate a Grafana.com Access Policy token"**
   - The token will appear as the password in the configuration
   - **OR** you can click "Use an API token" → "create a new token" if you prefer
   - **Recommendation**: Use the auto-generated Access Policy token (easier!)
9. **You'll see a configuration** with these values:
   - **Remote Write URL** (something like: `https://prometheus-prod-01-eu-west-0.grafana.net/api/prom/push`)
   - **Username** (usually a number like `123456`)
   - **Password** (the Access Policy token that was generated)
10. **Copy these three values** - you'll need them in the next step

**Important**: 
- Choose **"send metrics from a single prometheus instance"**
- Use the **auto-generated Access Policy token** (it's easier and designed for this purpose)
- Copy all three values: URL, Username, and Password

---

## Step 3: Deploy Prometheus on Render (to scrape your backend)

### Why Do We Need a Separate Prometheus Service?

**Your Backend** (already deployed):
- Runs your Node.js/Express API
- Exposes metrics at `/metrics` endpoint
- Handles your survey API requests

**Prometheus** (new service we're creating):
- Is a **separate application** (written in Go, not Node.js)
- **Scrapes** your backend's `/metrics` endpoint every 15 seconds
- **Collects and stores** those metrics temporarily
- **Forwards** them to Grafana Cloud using `remote_write`

**Think of it like this:**
- Your backend = the restaurant (serves food = metrics)
- Prometheus = the delivery service (picks up food and delivers it to Grafana Cloud)

They're two different applications that work together. Your backend creates metrics, Prometheus collects and forwards them.

**Why not just send directly from backend?**
- Grafana Cloud expects metrics in a specific format via `remote_write`
- Prometheus handles batching, retries, and proper formatting
- It's the standard way to collect metrics from multiple sources

Since Grafana Cloud doesn't scrape external endpoints directly, we need a Prometheus instance to scrape your backend and forward metrics to Grafana Cloud.

### 3.1: Create Prometheus Configuration

1. **In your project**, create a new directory: `prometheus/`
2. **Create file**: `prometheus/Dockerfile`

```dockerfile
FROM prom/prometheus:latest

COPY prometheus.yml /etc/prometheus/prometheus.yml

EXPOSE 9090
```

3. **Create file**: `prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

# Forward metrics to Grafana Cloud
remote_write:
  - url: YOUR_GRAFANA_CLOUD_REMOTE_WRITE_URL
    basic_auth:
      username: YOUR_GRAFANA_CLOUD_USERNAME
      password: YOUR_GRAFANA_CLOUD_PASSWORD

scrape_configs:
  # Scrape your backend API
  - job_name: 'survey-api'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['YOUR_BACKEND_SERVICE.onrender.com']
        labels:
          service: 'survey-api'
          environment: 'production'
    
  # Scrape Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

**Replace**:
- `YOUR_GRAFANA_CLOUD_REMOTE_WRITE_URL` - from Step 2
- `YOUR_GRAFANA_CLOUD_USERNAME` - from Step 2
- `YOUR_GRAFANA_CLOUD_PASSWORD` - from Step 2
- `YOUR_BACKEND_SERVICE.onrender.com` - your actual Render backend URL (without https://)

### 3.2: Deploy Prometheus on Render

1. **Go to**: https://dashboard.render.com
2. **Click**: **"New +"** → **"Web Service"**
3. **Connect your repository** (same one as your backend)
4. **Configure**:
   - **Name**: `prometheus` (or `survey-prometheus`)
   - **Root Directory**: `prometheus`
   - **Environment**: `Docker`
   - **Build Command**: (leave empty - Docker handles it)
   - **Start Command**: (leave empty - Docker handles it)
   - **Health Check Path**: `/-/healthy`
5. **Add Environment Variables** (optional, if needed):
   - `PROMETHEUS_CONFIG_PATH=/etc/prometheus/prometheus.yml`
6. **Click**: **"Create Web Service"**
7. **Wait for deployment** to complete (usually 2-3 minutes)

---

## Step 4: Verify Metrics Are Flowing

1. **Wait 1-2 minutes** after Prometheus deployment
2. **Go to Grafana Cloud**: https://your-org.grafana.net
3. **Click**: **"Explore"** in the left sidebar (compass icon)
4. **At the top**, select **"Hosted Prometheus Metrics"** as the data source
   - (This is the same one you set up in Step 2, not "Prometheus Data Source")
5. **In the query box**, type:
   ```
   up
   ```
6. **Click**: **"Run query"**
7. **You should see**:
   - `up{job="survey-api"}` with value `1` (means it's working!)
   - `up{job="prometheus"}` with value `1`

**If you see data**: ✅ Success! Metrics are flowing.
**If you don't see data**: 
- Wait a few more minutes
- Check Prometheus logs in Render
- Verify your backend URL is correct in `prometheus.yml`

---

## Step 5: Create Your First Dashboard

1. **In Grafana Cloud**, click **"Dashboards"** → **"New"** → **"New Dashboard"**
2. **Click**: **"Add visualization"** (or **"Add panel"**)
3. **Select**: **"Hosted Prometheus Metrics"** as data source
   - (Make sure you select "Hosted Prometheus Metrics", not "Prometheus Data Source")
4. **In the query box**, try these queries one by one:

### Request Rate (requests per second)
```
rate(http_requests_total[5m])
```

### Request Duration (95th percentile)
```
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Error Rate
```
rate(http_requests_total{status_code=~"5.."}[5m])
```

### Survey Responses per Minute
```
rate(survey_responses_total[1m]) * 60
```

### Active Requests
```
http_requests_in_flight
```

### Memory Usage (MB)
```
process_resident_memory_bytes / 1024 / 1024
```

5. **For each query**:
   - Click **"Run query"** to see the graph
   - Click **"Apply"** to add it to the dashboard
   - Click **"Add panel"** to add another metric

6. **Save your dashboard**:
   - Click the **"Save"** icon (disk) at the top
   - Give it a name: "Survey API Monitoring"
   - Click **"Save"**

---

## Step 6: Set Up Alerts (Optional but Recommended)

1. **In Grafana**, go to **"Alerting"** → **"Alert rules"** → **"New alert rule"**
2. **Configure**:
   - **Name**: "High Error Rate"
   - **Query**: `rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1`
   - **Condition**: When `A` is above `0.1`
   - **Evaluation**: Every `5m` for `5m`
3. **Add notification channel** (email, Slack, etc.)
4. **Save** the alert rule

---

## Step 7: Test Your Setup

1. **Make some requests** to your API:
   - Create a survey
   - Submit a response
   - Register a user
   - Login

2. **Go back to your Grafana dashboard**
3. **Refresh** (or wait a few seconds)
4. **You should see**:
   - Request counts increasing
   - Survey responses counter going up
   - User registrations/logins increasing

---

## Troubleshooting

### No metrics showing in Grafana

1. **Check Prometheus logs** in Render:
   - Go to your Prometheus service in Render
   - Click **"Logs"** tab
   - Look for errors

2. **Verify backend metrics endpoint**:
   - Visit: `https://your-backend.onrender.com/metrics`
   - You should see Prometheus-formatted text
   - If you get 404, the endpoint isn't set up correctly

3. **Check Prometheus configuration**:
   - Verify the backend URL in `prometheus.yml` is correct
   - Verify Grafana Cloud credentials are correct
   - Make sure there are no typos

4. **Check data source**:
   - In Grafana, go to **"Connections"** → **"Data sources"**
   - Click on **"Hosted Prometheus Metrics"**
   - Click **"Test"** - it should say "Data source is working"

### Prometheus can't scrape backend

- **Check CORS**: Your backend should allow requests from Prometheus
- **Check URL**: Make sure the URL in `prometheus.yml` is correct (no `https://`, just the domain)
- **Check `/metrics` endpoint**: It should be publicly accessible (or add authentication)

### High costs warning

- Grafana Cloud free tier includes:
  - 10,000 active series
  - 50 GB logs
  - 14-day retention
- If you see warnings, you might be creating too many unique metric combinations
- Check your label usage in metrics

---

## Available Metrics

Your backend exposes the following metrics at `/metrics`:

### HTTP Metrics
- `http_requests_total` - Total HTTP requests by method, route, status code
- `http_request_duration_seconds` - Request duration histogram
- `http_requests_in_flight` - Current requests being processed

### Database Metrics
- `db_queries_total` - Total database queries
- `db_query_duration_seconds` - Query duration histogram
- `db_connections_active` - Active database connections

### Business Metrics
- `surveys_created_total` - Total surveys created
- `survey_responses_total` - Total survey responses (with survey_id label)
- `users_registered_total` - Total user registrations
- `user_logins_total` - Total user logins

### System Metrics (Default)
- `process_cpu_user_seconds_total` - CPU usage
- `process_resident_memory_bytes` - Memory usage
- `nodejs_heap_size_total_bytes` - Node.js heap size
- And more...

## Quick Reference

### Your URLs
- **Grafana Cloud**: `https://your-org.grafana.net`
- **Backend Metrics**: `https://your-backend.onrender.com/metrics`
- **Prometheus**: `https://your-prometheus.onrender.com` (optional, for debugging)

### Important Files
- `prometheus/prometheus.yml` - Prometheus configuration (update with your credentials)
- `prometheus/Dockerfile` - Docker image for Prometheus
- `src/middleware/metrics.ts` - Backend metrics collection

### Useful Queries

**All available metrics**:
```
{__name__=~".+"}
```

**Request rate by endpoint**:
```
sum(rate(http_requests_total[5m])) by (route)
```

**Top 5 slowest endpoints**:
```
topk(5, histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])))
```

---

## Next Steps

1. ✅ **Set up basic monitoring** (you just did this!)
2. 📊 **Create custom dashboards** for your specific needs
3. 🔔 **Set up alerts** for critical metrics
4. 📈 **Monitor trends** over time
5. 🔍 **Investigate issues** using metrics when problems occur

---

## Support

- **Grafana Cloud Docs**: https://grafana.com/docs/grafana-cloud/
- **Prometheus Docs**: https://prometheus.io/docs/
- **PromQL Guide**: https://prometheus.io/docs/prometheus/latest/querying/basics/

---

**That's it!** You now have monitoring set up with Grafana Cloud. 🎉

