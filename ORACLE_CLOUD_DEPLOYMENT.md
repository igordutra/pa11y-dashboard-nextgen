# Deploying to Oracle Cloud (Always Free Tier)

Oracle Cloud provides an incredibly generous "Always Free" tier, offering an Ampere A1 Compute instance with up to 24GB of RAM and 200GB of persistent storage. This is the **perfect** environment for `pa11y-dashboard-nextgen` because Puppeteer/Chromium can run smoothly without Memory (OOM) errors, and your generated screenshots will be safely stored on disk.

We've created a custom Dockerfile and Docker Compose setup specifically tailored for this unified production deployment.

## Prerequisites
1. An [Oracle Cloud Account](https://www.oracle.com/cloud/free/).
2. Basic knowledge of SSH.

---

## Step 1: Create the Compute Instance

1. Log in to your Oracle Cloud Console.
2. Go to **Compute -> Instances** and click **Create Instance**.
3. **Name:** `pa11y-dashboard` (or whatever you prefer).
4. **Image and Shape:**
   - Click **Edit**.
   - **Image:** Select **Canonical Ubuntu** (22.04 or 24.04).
   - **Shape:** Select **Ampere** -> **VM.Standard.A1.Flex**.
   - **OCPUs:** Drag the slider to **4** (or what you need).
   - **Memory (GB):** Drag the slider up to **24** (or leave as default if 24GB isn't available).
5. **Networking:** Leave as default (Create new VCN and Subnet, ensure "Assign a public IPv4 address" is checked).
6. **Add SSH Keys:** Select **Generate a key pair for me** and click **Save private key**. *Do not lose this file!*
7. **Boot Volume:** Leave the default (usually 47GB or 50GB, which is plenty).
8. Click **Create** and wait for the instance to show as "Running". Note the **Public IP Address**.

---

## Step 2: Open Ingress Ports on Oracle Cloud

By default, Oracle Cloud blocks all incoming traffic except SSH (Port 22).

1. On your Instance details page, click on the **Subnet** link (e.g., `subnet-xxxx`).
2. Click on the **Security List** (e.g., `Default Security List for vcn-xxxx`).
3. Click **Add Ingress Rules**.
4. Configure the rule:
   - **Source CIDR:** `0.0.0.0/0`
   - **Destination Port Range:** `80` (This is the port we will use for the dashboard).
   - **Description:** Allow HTTP for Pa11y Dashboard.
5. Click **Add Ingress Rules**.

---

## Step 3: Connect to your Instance

Open your local terminal and connect using the SSH key you downloaded:

```bash
# Set secure permissions on your key
chmod 400 ~/Downloads/ssh-key-*.key

# Connect to the Ubuntu instance
ssh -i ~/Downloads/ssh-key-*.key ubuntu@<YOUR_PUBLIC_IP>
```

---

## Step 4: Open Ubuntu Firewall (iptables)

Ubuntu images on Oracle Cloud have an OS-level firewall that also blocks traffic. Run these commands on your instance:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo netfilter-persistent save
```

---

## Step 5: Install Docker and Git

While SSH'd into your instance, run the following to install the necessary tools:

```bash
# Update packages
sudo apt-get update

# Install Docker, Docker Compose, and Git
sudo apt-get install -y docker.io docker-compose-v2 git

# Allow your user to run Docker commands without sudo
sudo usermod -aG docker $USER

# Apply the group change (this temporarily switches your shell group, or you can simply logout/login)
newgrp docker
```

---

## Step 6: Clone and Configure the Application

1. **Clone your repository:**
   *(Replace with your actual GitHub repo URL if it's hosted there, or transfer the files over)*
   ```bash
   git clone https://github.com/YOUR_USERNAME/pa11y-dashboard-nextgen.git
   cd pa11y-dashboard-nextgen
   ```

2. **Set up the Environment Variable:**
   Open `docker-compose.oracle.yml` using `nano`:
   ```bash
   nano docker-compose.oracle.yml
   ```
   Find the line under the `app` environment variables that says:
   `CLIENT_URL=http://<YOUR_PUBLIC_IP>`
   
   Change `<YOUR_PUBLIC_IP>` to your instance's actual public IP address. Press `Ctrl+O`, `Enter`, then `Ctrl+X` to save and exit.

---

## Step 7: Build and Start the Application

We use a special Compose file that builds a single, unified container (Frontend + Backend served together) optimized for production on Oracle's ARM architecture.

```bash
docker compose -f docker-compose.oracle.yml up -d --build
```

*(Note: The build process might take 2-4 minutes as it compiles the frontend and installs Chromium).*

---

## Step 8: Access the Dashboard!

Once the build finishes and the containers start up, open your web browser and navigate to:

**http://<YOUR_PUBLIC_IP>**

### Important Notes for Production
- **Screenshots:** All generated screenshots are saved to the persistent Docker volume (`screenshots_data`), so they will survive server restarts and updates.
- **Updates:** To pull the latest code and rebuild:
  ```bash
  git pull
  docker compose -f docker-compose.oracle.yml up -d --build
  ```

---

## Troubleshooting

### "Out of capacity for shape VM.Standard.A1.Flex" Error
This is a very common issue with Oracle's "Always Free" tier. The Ampere (ARM) instances are extremely popular, and regions occasionally run out of free capacity. 

**Solutions:**
1. **Try a different Availability Domain (AD):** When configuring the instance, look for the "Placement" section and click "Edit". If your region has multiple ADs (e.g., AD-1, AD-2, AD-3), switch to one of the others and try again.
2. **Wait and Retry:** Oracle frees up resources constantly as idle accounts are reclaimed. Trying again late at night, early in the morning, or the next day often works.
3. **Use the AMD Micro Shape (Fallback Option):** You can fall back to the AMD-based `VM.Standard.E2.1.Micro` shape. *However, this shape only has 1GB of RAM.* To run Puppeteer without running Out of Memory (OOM), you **must** configure a swap file immediately after SSHing into the instance (Step 3). Run these commands before installing Docker:

   ```bash
   # Create a 4GB Swap file to prevent memory crashes
   sudo fallocate -l 4G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   
   # Make it permanent
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```
   After making the swap file, proceed with Step 5.
