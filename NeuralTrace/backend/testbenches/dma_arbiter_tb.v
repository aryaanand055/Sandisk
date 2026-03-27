// dma_arbiter_tb.v
module dma_arbiter_tb;
    reg clk, rst_n;
    reg [3:0] req;
    wire [3:0] gnt;

    dma_arbiter dut (.*);

    initial begin
        clk = 0; forever #5 clk = ~clk;
    end

    initial begin
        rst_n = 0; req = 0;
        #20 rst_n = 1;
        #10 req = 4'b0110; // Req from 1 and 2
        #10 wait(gnt != 0);
        #40 req = 4'b0000;
        #100 $finish;
    end
endmodule
